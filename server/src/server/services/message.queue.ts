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

import { GeneralError, type LoggerHandler } from '../../utils/index.ts';

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

  #publishers: { [key: string]: Publisher };
  readonly #consumers: Consumer[];

  readonly #logger;

  readonly #connectionEventHandlers;
  readonly #publisherEventHandlers;
  readonly #consumerEventHandlers;

  #isAlive = false;
  #isReady = false;

  public constructor(params: {
    connectionOptions: ConnectionOptions;
    logger: LoggerHandler;
  }) {
    const { connectionOptions, logger } = params;

    this.#connectionEventHandlers = Object.entries({
      error: this.#handleErrorEvent.bind(this),
      connection: this.#handleConnectionEvent.bind(this),
      'connection.blocked': this.#handleBlockedEvent.bind(this),
      'connection.unblocked': this.#handleUnblockedEvent.bind(this),
    });
    this.#publisherEventHandlers = Object.entries({
      'basic.return': this.#handleUndeliveredMessageEvent.bind(this),
    });
    this.#consumerEventHandlers = Object.entries({
      error: this.#handleConsumerErrorEvent.bind(this),
    });

    this.#handler = new Connection(connectionOptions)
      .on('error', this.#handleErrorEvent.bind(this))
      .on('connection', this.#handleConnectionEvent.bind(this))
      .on('connection.blocked', this.#handleBlockedEvent.bind(this))
      .on('connection.unblocked', this.#handleUnblockedEvent.bind(this));

    this.#publishers = {};
    this.#consumers = [];

    this.#logger = logger;
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

          const publisher = this.#handler.createPublisher({
            ...options,
            exchanges,
            queues,
            queueBindings,
          });

          this.#publisherEventHandlers.forEach(([name, handler]) => {
            //@ts-expect-error Typescript can't infer the type since Object.entries()
            // keys are not generic. It works
            publisher.on(name, handler);
          });

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
    const exchanges: ConsumerProps['exchanges'] = [
      { exchange, passive: true, durable: true },
    ];
    const queueBindings: ConsumerProps['queueBindings'] = [
      { exchange, queue, routingKey },
    ];

    const consumer = this.#handler.createConsumer(
      {
        ...options,
        exchanges,
        queue,
        queueBindings,
        queueOptions: { passive: true },
      },
      handler,
    );

    this.#consumerEventHandlers.forEach(([name, handler]) => {
      //@ts-expect-error Typescript can't infer the type since Object.entries()
      // keys are not generic. It works
      consumer.on(name, handler);
    });

    this.#consumers.push(consumer);
  }

  public async close() {
    this.#isAlive = false;
    this.#isReady = false;

    try {
      await Promise.all(
        Object.values(this.#publishers).map(async (publisher) => {
          await publisher.close();
          this.#publisherEventHandlers.forEach(([name, handler]) => {
            publisher.removeListener(name, handler);
          });
        }),
      );
    } catch (err) {
      console.error('Failure to shutdown publisher(s):', err);
    }

    try {
      await Promise.all(
        this.#consumers.map(async (consumer) => {
          await consumer.close();
          this.#consumerEventHandlers.forEach(([name, handler]) => {
            consumer.removeListener(name, handler);
          });
        }),
      );
    } catch (err) {
      console.error('Failure to shutdown consumer(s):', err);
    }

    try {
      await this.#handler.close();
      this.#connectionEventHandlers.forEach(([name, handler]) => {
        this.#handler.removeListener(name, handler);
      });
    } catch (err) {
      console.error('Failure to close message queue connection:', err);
    }
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

  /********************************************************************************/

  #handleErrorEvent(err: unknown) {
    this.#isAlive = false;
    this.#isReady = false;

    this.#logger.error('Error during message queue usage:', err);
  }

  #handleConnectionEvent() {
    this.#isAlive = true;
    this.#isReady = true;

    this.#logger.info('Message queue (re)connected');
  }

  #handleBlockedEvent(reason: unknown) {
    this.#isReady = false;

    this.#logger.error('Message queue is blocked', reason);
  }

  #handleUnblockedEvent() {
    this.#isReady = true;

    this.#logger.info('Message queue is unblocked');
  }

  #handleUndeliveredMessageEvent(message: ReturnedMessage) {
    this.#logger.error('Message was not delivered:', message);
  }

  #handleConsumerErrorEvent(err: unknown) {
    this.#logger.error('Consumer error:', err);
  }
}

/**********************************************************************************/

export default MessageQueue;
