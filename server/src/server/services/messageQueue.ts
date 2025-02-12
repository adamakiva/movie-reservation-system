import {
  Connection,
  type ConnectionOptions,
  type Envelope,
  type PublisherProps,
  type ReturnedMessage,
} from 'rabbitmq-client';

import {
  GeneralError,
  HTTP_STATUS_CODES,
  type LoggerHandler,
} from '../../utils/index.ts';

/**********************************************************************************/

type PublishersNames = ['ticket'];
type Exchanges = ['mrs'];
type Queues = {
  [K in Exchanges[number]]: [
    `${K}.${PublishersNames[0]}.reserve`,
    `${K}.${PublishersNames[0]}.cancel`,
  ];
};
type RoutingKeys = {
  [K in Exchanges[number]]: [
    `${K}-${PublishersNames[0]}-reserve`,
    `${K}-${PublishersNames[0]}-cancel`,
  ];
};

/**********************************************************************************/

class MessageQueue<E extends Exchanges[number] = Exchanges[number]> {
  readonly #handler;
  readonly #publishers;

  readonly #logger;

  #isAlive = false;
  #isReady = false;

  public constructor(params: {
    connectionOptions: ConnectionOptions;
    publishers: {
      // eslint-disable-next-line no-unused-vars
      [K in PublishersNames[number]]: Pick<
        PublisherProps,
        'confirm' | 'maxAttempts'
      > & {
        routing: {
          exchange: E;
          queue: Queues[E][number];
          routingKey: RoutingKeys[E][number];
        }[];
      };
    };
    logger: LoggerHandler;
  }) {
    const { connectionOptions, publishers, logger } = params;

    this.#handler = new Connection(connectionOptions)
      .on('error', this.#handleErrorEvent.bind(this))
      .on('connection', this.#handleConnectionEvent.bind(this))
      .on('connection.blocked', this.#handleBlockedEvent.bind(this))
      .on('connection.unblocked', this.#handleUnblockedEvent.bind(this));

    this.#publishers = Object.fromEntries(
      Object.entries(publishers).map(([publisher, publisherOptions]) => {
        const { routing, ...options } = publisherOptions;

        const exchanges: PublisherProps['exchanges'] = [];
        const queues: PublisherProps['queues'] = [];
        const queueBindings: PublisherProps['queueBindings'] = [];
        routing.forEach(({ exchange, queue, routingKey }) => {
          exchanges.push({ exchange, passive: true });
          queues.push({ queue, passive: true });
          queueBindings.push({ exchange, queue, routingKey });
        });

        const handler = this.#handler
          .createPublisher({ ...options, exchanges, queues, queueBindings })
          .on('basic.return', this.#handleUndeliveredMessageEvent.bind(this));

        return [publisher, handler];
      }),
    );

    this.#logger = logger;
  }

  public async close() {
    this.#isAlive = false;
    this.#isReady = false;

    this.#handler
      .removeListener('error', this.#handleErrorEvent)
      .removeListener('connection', this.#handleConnectionEvent)
      .removeListener('connection.blocked', this.#handleBlockedEvent)
      .removeListener('connection.unblocked', this.#handleUnblockedEvent);

    await Promise.all(
      Object.values(this.#publishers).map(async (publisher) => {
        await publisher.close();
      }),
    );

    await this.#handler.close();
  }

  public async publish(params: {
    publisher: PublishersNames[number];
    exchange: E;
    routingKey: RoutingKeys[E][number];
    data: Buffer | string | object;
    options: Omit<Envelope, 'exchange' | 'routingKey'>;
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

    return this.#isAlive;
  }

  public isReady() {
    this.isAlive();

    if (!this.#isReady) {
      throw new GeneralError(
        HTTP_STATUS_CODES.GATEWAY_TIMEOUT,
        'Message queue is not ready',
      );
    }

    return this.#isReady;
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
    this.#logger.error('Message was not delivered. This may help', message);
  }
}

/**********************************************************************************/

export default MessageQueue;
