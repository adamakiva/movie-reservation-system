import {
  HTTP_STATUS_CODES,
  type CORRELATION_IDS,
  type Exchanges,
  type Publishers,
  type Queues,
  type RoutingKeys,
} from '@adamakiva/movie-reservation-system-shared';
import {
  Connection,
  type ConnectionOptions,
  type Consumer,
  type ConsumerHandler,
  type ConsumerProps,
  type Envelope,
  type Publisher,
  type PublisherProps,
  type ReturnedMessage,
} from 'rabbitmq-client';

import { GeneralError } from '../../utils/errors.ts';
import type { Logger } from '../../utils/logger.ts';

/**********************************************************************************/

type PublishOptions = Omit<
  Envelope,
  'exchange' | 'routingKey' | 'correlationId'
> & {
  correlationId?: (typeof CORRELATION_IDS)[keyof typeof CORRELATION_IDS];
};

/**********************************************************************************/

class MessageQueue {
  readonly #handler;
  readonly #logger;

  #publishers: { [key: string]: Publisher };
  readonly #consumers: Consumer[];

  #isAlive;
  #isReady;

  public constructor(params: {
    connectionOptions: ConnectionOptions;
    logger: Logger;
  }) {
    const { connectionOptions, logger } = params;

    this.#isAlive = false;
    this.#isReady = false;

    this.#handler = new Connection(connectionOptions)
      .on('error', this.#handleErrorEvent)
      .on('connection', this.#handleConnectionEvent)
      .on('connection.blocked', this.#handleBlockedEvent)
      .on('connection.unblocked', this.#handleUnblockedEvent);

    this.#logger = logger;

    this.#publishers = {};
    this.#consumers = [];
  }

  public createPublishers(publishers: {
    // eslint-disable-next-line no-unused-vars
    [K in Publishers[number]]: Pick<
      PublisherProps,
      'confirm' | 'maxAttempts'
    > & {
      routing: {
        exchange: Exchanges[number];
        queue: Queues[keyof Queues][number];
        routingKey: RoutingKeys[keyof RoutingKeys][number];
      }[];
    };
  }) {
    this.#publishers = {
      ...this.#publishers,
      ...Object.fromEntries(
        Object.entries(publishers).map(([publisherName, publisherOptions]) => {
          const { routing, ...options } = publisherOptions;

          const exchanges: PublisherProps['exchanges'] = [];
          const queues: PublisherProps['queues'] = [];
          const queueBindings: PublisherProps['queueBindings'] = [];

          routing.forEach(({ exchange, queue, routingKey }) => {
            exchanges.push({ exchange, passive: true, durable: true });
            queues.push({ queue, passive: true, durable: true });
            queueBindings.push({ exchange, queue, routingKey });
          });

          const publisher = this.#handler
            .createPublisher({
              ...options,
              exchanges,
              queues,
              queueBindings,
            })
            .on('basic.return', this.#handleUndeliveredMessageEvent);

          return [publisherName, publisher] as const;
        }),
      ),
    };
  }

  public createConsumer(
    consumerProps: Pick<ConsumerProps, 'concurrency' | 'exclusive' | 'qos'> & {
      routing: {
        exchange: Exchanges[number];
        queue: Queues[keyof Queues][number];
        routingKey: RoutingKeys[keyof RoutingKeys][number];
      };
      handler: ConsumerHandler;
    },
  ) {
    const {
      routing: { exchange, queue, routingKey },
      handler,
      ...options
    } = consumerProps;

    const consumer = this.#handler
      .createConsumer(
        {
          ...options,
          exchanges: [{ exchange, passive: true, durable: true }],
          queue,
          queueBindings: [{ exchange, queue, routingKey }],
          queueOptions: { passive: true, durable: true },
        },
        handler,
      )
      .on('error', this.#handleConsumerErrorEvent);

    this.#consumers.push(consumer);
  }

  public async publish(params: {
    publisher: Publishers[number];
    exchange: Exchanges[number];
    routingKey: RoutingKeys[keyof RoutingKeys][number];
    data: Buffer | string | object;
    options: PublishOptions;
  }) {
    const { publisher, exchange, routingKey, data, options } = params;

    await this.#publishers[publisher]!.send(
      { ...options, exchange, routingKey },
      data,
    );
  }

  public isAlive() {
    if (!this.#isAlive) {
      throw new GeneralError(
        HTTP_STATUS_CODES.GATEWAY_TIMEOUT,
        'Message queue is not alive',
      );
    }
  }

  public isReady() {
    this.isAlive();

    if (!this.#isReady) {
      throw new GeneralError(
        HTTP_STATUS_CODES.GATEWAY_TIMEOUT,
        'Message queue is not ready',
      );
    }
  }

  public async close() {
    this.#isAlive = false;
    this.#isReady = false;

    await Promise.allSettled(
      Object.values(this.#publishers).map((publisher) => {
        return publisher
          .close()
          .catch(() => {
            // On purpose
          })
          .finally(() => {
            publisher.removeListener(
              'basic-return',
              this.#handleUndeliveredMessageEvent,
            );
          });
      }),
    );

    await Promise.allSettled(
      this.#consumers.map((consumer) => {
        return consumer
          .close()
          .catch(() => {
            // On purpose
          })
          .finally(() => {
            consumer.removeListener('error', this.#handleConsumerErrorEvent);
          });
      }),
    );

    await this.#handler
      .close()
      .catch(() => {
        // On purpose
      })
      .finally(() => {
        this.#handler
          .removeListener('connection.unblocked', this.#handleUnblockedEvent)
          .removeListener('connection.blocked', this.#handleBlockedEvent)
          .removeListener('connection', this.#handleConnectionEvent)
          .removeListener('error', this.#handleErrorEvent);
      });
  }

  /********************************************************************************/

  readonly #handleErrorEvent = (error: unknown) => {
    this.#isAlive = false;
    this.#isReady = false;

    this.#logger.error('Error during message queue usage:', error);
  };

  readonly #handleConnectionEvent = () => {
    this.#isAlive = true;
    this.#isReady = true;

    this.#logger.info('Message queue (re)connected');
  };

  readonly #handleBlockedEvent = (reason: unknown) => {
    this.#isReady = false;

    this.#logger.error('Message queue is blocked', reason);
  };

  readonly #handleUnblockedEvent = () => {
    this.#isReady = true;

    this.#logger.info('Message queue is unblocked');
  };

  readonly #handleUndeliveredMessageEvent = (message: ReturnedMessage) => {
    this.#logger.error('Message was not delivered:', message);
  };

  readonly #handleConsumerErrorEvent = (error: unknown) => {
    this.#logger.error('Consumer error:', error);
  };
}

/**********************************************************************************/

export { MessageQueue };
