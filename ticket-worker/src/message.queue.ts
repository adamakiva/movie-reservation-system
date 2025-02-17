import {
  Connection,
  type ConnectionOptions,
  type Consumer,
  type ConsumerHandler,
  type ConsumerProps,
  type Publisher,
  type PublisherProps,
  type ReturnedMessage,
} from 'rabbitmq-client';

/**********************************************************************************/

type Exchanges = ['mrs'];
type Consumers = ['ticket'];
type Publishers = ['ticket'];
type ConsumersQueues = {
  [K in Exchanges[number]]: [
    `${K}.${Publishers[0]}.reserve`,
    `${K}.${Publishers[0]}.cancel`,
  ];
};
type ConsumersRoutingKeys = {
  [K in Exchanges[number]]: [
    `${K}-${Publishers[0]}-reserve`,
    `${K}-${Publishers[0]}-cancel`,
  ];
};
type PublishersQueues = {
  [K in Exchanges[number]]: [
    `${K}.${Consumers[0]}.reserve.reply.to`,
    `${K}.${Consumers[0]}.cancel.reply.to`,
  ];
};
type PublishersRoutingKeys = {
  [K in Exchanges[number]]: [
    `${K}-${Consumers[0]}-reserve-reply-to`,
    `${K}-${Consumers[0]}-cancel-reply-to`,
  ];
};

/**********************************************************************************/

class MessageQueue<E extends Exchanges[number] = Exchanges[number]> {
  readonly #handler;

  #publishers: { [key: string]: Publisher };
  readonly #consumers: Consumer[];

  public constructor(connectionOptions: ConnectionOptions) {
    this.#handler = new Connection(connectionOptions)
      .on('error', this.#handleErrorEvent.bind(this))
      .on('connection', this.#handleConnectionEvent.bind(this))
      .on('connection.blocked', this.#handleBlockedEvent.bind(this))
      .on('connection.unblocked', this.#handleUnblockedEvent.bind(this));

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

    return this.#publishers;
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

    return this.#consumers;
  }

  public async close() {
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

  /********************************************************************************/

  #handleErrorEvent(err: unknown) {
    console.error('Error during message queue usage. This may help:', err);
  }

  #handleConnectionEvent() {
    console.info('Message queue (re)connected');
  }

  #handleBlockedEvent(reason: unknown) {
    console.error(reason, 'Message queue is blocked');
  }

  #handleUnblockedEvent() {
    console.info('Message queue is unblocked');
  }

  #handleUndeliveredMessageEvent(message: ReturnedMessage) {
    console.error('Message was not delivered. This may help:', message);
  }

  #handleConsumerErrorEvent(error: unknown) {
    console.error(error, 'Consumer error');
  }
}

/**********************************************************************************/

export default MessageQueue;
