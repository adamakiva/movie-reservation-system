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

import {
  GeneralError,
  HTTP_STATUS_CODES,
  type LoggerHandler,
  type MESSAGE_QUEUE,
} from '../../utils/index.ts';

/**********************************************************************************/

type Exchanges = ['mrs'];
type Publishers = ['ticket'];
type Consumers = ['ticket'];
type PublishersQueues = {
  [K in Exchanges[number]]: [
    `${K}.${Publishers[0]}.reserve`,
    `${K}.${Publishers[0]}.cancel`,
  ];
};
type PublishersRoutingKeys = {
  [K in Exchanges[number]]: [
    `${K}-${Publishers[0]}-reserve`,
    `${K}-${Publishers[0]}-cancel`,
  ];
};
type ConsumersQueues = {
  [K in Exchanges[number]]: [
    `${K}.${Consumers[0]}.reserve.reply.to`,
    `${K}.${Consumers[0]}.cancel.reply.to`,
  ];
};
type ConsumersRoutingKeys = {
  [K in Exchanges[number]]: [
    `${K}-${Consumers[0]}-reserve-reply-to`,
    `${K}-${Consumers[0]}-cancel-reply-to`,
  ];
};

type PublishOptions<E extends Exchanges[number]> = Omit<
  Envelope,
  'exchange' | 'routingKey' | 'replyTo' | 'correlationId'
> & {
  replyTo?: ConsumersQueues[E][number];
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

  #isAlive = false;
  #isReady = false;

  public constructor(params: {
    connectionOptions: ConnectionOptions;
    logger: LoggerHandler;
  }) {
    const { connectionOptions, logger } = params;

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
        queue: PublishersQueues[E][number];
        routingKey: PublishersRoutingKeys[E][number];
      }[];
    };
  }) {
    this.#publishers = {
      ...this.#publishers,
      ...Object.fromEntries(
        Object.entries(publishers).map(([publisher, publisherOptions]) => {
          const { routing, ...options } = publisherOptions;

          const exchanges: PublisherProps['exchanges'] = [];
          const queues: PublisherProps['queues'] = [];
          const queueBindings: PublisherProps['queueBindings'] = [];
          routing.forEach(({ exchange, queue, routingKey }) => {
            exchanges.push({ exchange, passive: true, durable: true });
            queues.push({ queue, passive: true });
            queueBindings.push({ exchange, queue, routingKey });
          });

          const handler = this.#handler
            .createPublisher({ ...options, exchanges, queues, queueBindings })
            .on('basic.return', this.#handleUndeliveredMessageEvent.bind(this));

          return [publisher, handler];
        }),
      ),
    };
  }

  public createConsumer(
    consumer: Pick<ConsumerProps, 'concurrency' | 'exclusive' | 'qos'> & {
      routing: {
        exchange: E;
        queue: ConsumersQueues[E][number];
        routingKey: ConsumersRoutingKeys[E][number];
      };
      handler: ConsumerHandler;
    },
  ) {
    const {
      routing: { exchange, queue, routingKey },
      handler,
      ...options
    } = consumer;
    const exchanges: ConsumerProps['exchanges'] = [
      { exchange, passive: true, durable: true },
    ];
    const queueBindings: ConsumerProps['queueBindings'] = [
      { exchange, queue, routingKey },
    ];

    this.#consumers.push(
      this.#handler
        .createConsumer(
          {
            ...options,
            exchanges,
            queue,
            queueBindings,
            queueOptions: { passive: true },
          },
          handler,
        )
        .on('error', this.#handleConsumerErrorEvent.bind(this)),
    );
  }

  public async close() {
    this.#isAlive = false;
    this.#isReady = false;

    this.#handler
      .removeListener('error', this.#handleErrorEvent)
      .removeListener('connection', this.#handleConnectionEvent)
      .removeListener('connection.blocked', this.#handleBlockedEvent)
      .removeListener('connection.unblocked', this.#handleUnblockedEvent);

    await Promise.all([
      Promise.all(
        Object.values(this.#publishers).map(async (publisher) => {
          await publisher.close();
        }),
      ),
      Promise.all(
        this.#consumers.map(async (consumer) => {
          await consumer.close();
        }),
      ),
    ]);

    await this.#handler.close();
  }

  public async publish(params: {
    publisher: Publishers[number];
    exchange: E;
    routingKey: PublishersRoutingKeys[E][number];
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

    this.#logger.error('Error during message queue usage. This may help:', err);
  }

  #handleConnectionEvent() {
    this.#isAlive = true;
    this.#isReady = true;

    this.#logger.info('Message queue (re)connected');
  }

  #handleBlockedEvent(reason: unknown) {
    this.#isReady = false;

    this.#logger.error(reason, 'Message queue is blocked');
  }

  #handleUnblockedEvent() {
    this.#isReady = true;

    this.#logger.info('Message queue is unblocked');
  }

  #handleUndeliveredMessageEvent(message: ReturnedMessage) {
    this.#logger.error('Message was not delivered. This may help:', message);
  }

  #handleConsumerErrorEvent(error: unknown) {
    this.#logger.error(error, 'Consumer error');
  }
}

/**********************************************************************************/

export default MessageQueue;
