import {
  HTTP_STATUS_CODES,
  type Exchanges,
  type MESSAGE_QUEUE,
  type Publishers,
  type ServerConsumersQueues,
  type ServerConsumersRoutingKeys,
  type ServerPublishersQueues,
  type ServerPublishersRoutingKeys,
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

import { GeneralError, type Logger } from '../../utils/index.ts';

/**********************************************************************************/

type PublishOptions<E extends Exchanges[number]> = Omit<
  Envelope,
  'exchange' | 'routingKey' | 'replyTo' | 'correlationId'
> & {
  replyTo?: ServerConsumersQueues[E][number];
  correlationId?:
    | (typeof MESSAGE_QUEUE)['TICKET']['RESERVE']['CORRELATION_ID']
    | (typeof MESSAGE_QUEUE)['TICKET']['CANCEL']['CORRELATION_ID'];
};

/**********************************************************************************/

class MessageQueue<E extends Exchanges[number] = Exchanges[number]> {
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
        exchange: E;
        queue: ServerPublishersQueues[E][number];
        routingKey: ServerPublishersRoutingKeys[E][number];
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
            queues.push({ queue, passive: true });
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
        exchange: E;
        queue: ServerConsumersQueues[E][number];
        routingKey: ServerConsumersRoutingKeys[E][number];
      };
      handler: ConsumerHandler;
    },
  ) {
    const {
      routing: { exchange, queue, routingKey },
      handler,
      ...options
    } = consumerProps;

    this.#consumers.push(
      this.#handler
        .createConsumer(
          {
            ...options,
            exchanges: [{ exchange, passive: true, durable: true }],
            queue,
            queueBindings: [{ exchange, queue, routingKey }],
            queueOptions: { passive: true },
          },
          handler,
        )
        .on('error', this.#handleConsumerErrorEvent),
    );
  }

  public async publish(params: {
    publisher: Publishers[number];
    exchange: E;
    routingKey: ServerPublishersRoutingKeys[E][number];
    data: Buffer | string | object;
    options: PublishOptions<E>;
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

    await this.#closeConnections();
    this.#removeEventListeners();
  }

  /********************************************************************************/

  async #closeConnections() {
    try {
      await Promise.all(
        Object.values(this.#publishers).map(async (publisher) => {
          await publisher.close();
        }),
      );
    } catch (error) {
      console.error('Failure to shutdown publisher(s):', error);
    }

    try {
      await Promise.all(
        this.#consumers.map(async (consumer) => {
          await consumer.close();
        }),
      );
    } catch (error) {
      console.error('Failure to shutdown consumer(s):', error);
    }

    try {
      await this.#handler.close();
    } catch (error) {
      console.error('Failure to close message queue connection:', error);
    }
  }

  #removeEventListeners() {
    Object.values(this.#publishers).forEach((publisher) => {
      publisher.removeListener(
        'basic-return',
        this.#handleUndeliveredMessageEvent,
      );
    });
    this.#consumers.forEach((consumer) => {
      consumer.removeListener('error', this.#handleConsumerErrorEvent);
    });
    this.#handler
      .removeListener('connection.unblocked', this.#handleUnblockedEvent)
      .removeListener('connection.blocked', this.#handleBlockedEvent)
      .removeListener('connection', this.#handleConnectionEvent)
      .removeListener('error', this.#handleErrorEvent);
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
