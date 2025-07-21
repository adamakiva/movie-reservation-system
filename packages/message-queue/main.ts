import type { Buffer } from 'node:buffer';

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

/**********************************************************************************/

type Logger = {
  // eslint-disable-next-line no-unused-vars
  info: (...arguments_: unknown[]) => void;
  // eslint-disable-next-line no-unused-vars
  error: (...arguments_: unknown[]) => void;
};

const CORRELATION_IDS = {
  TICKET_RESERVATION: 'ticket.reserve',
  TICKET_CANCELLATION: 'ticket.cancel',
  SHOWTIME_CANCELLATION: 'showtime.cancel',
} as const;

type Exchanges = ['mrs'];
type Consumers = ['ticket', 'showtime'];
type Publishers = ['ticket', 'showtime'];

type Queues = {
  ticket: [
    'mrs.ticket.reserve',
    'mrs.ticket.cancel',
    'mrs.ticket.reserve.reply.to',
    'mrs.ticket.cancel.reply.to',
  ];
  showtime: ['mrs.showtime.cancel', 'mrs.showtime.cancel.reply.to'];
};
type RoutingKeys = {
  ticket: [
    'mrs-ticket-reserve',
    'mrs-ticket-cancel',
    'mrs-ticket-reserve-reply-to',
    'mrs-ticket-cancel-reply-to',
  ];
  showtime: ['mrs-showtime-cancel', 'mrs-showtime-cancel-reply-to'];
};

type TicketReservationsMessage = {
  showtimeId: string;
  userShowtimeId: string;
  userDetails: { id: string; email: string };
  movieDetails: {
    hallName: string;
    movieTitle: string;
    price: number;
    at: Date;
    row: number;
    column: number;
  };
};
type TicketCancellationMessage = {
  showtimeId: string;
  userIds: string | string[];
};
type ShowtimeCancellationMessage = {
  showtimeId: string;
  userIds: string[];
};

/**********************************************************************************/

class MessageQueue {
  readonly #boundErrorEventHandler;
  readonly #boundConnectionEventHandler;
  readonly #boundBlockEventHandler;
  readonly #boundUnblockedEventHandler;
  readonly #boundUndeliveredMessageEventHandler;
  readonly #boundConsumerErrorEventHandler;

  readonly #handler;
  readonly #logger;

  #publishers: { [key: string]: Publisher };
  readonly #consumers: Consumer[];

  #isAlive;
  #isReady;

  public constructor(parameters: {
    connectionOptions: ConnectionOptions;
    logger: Logger;
  }) {
    const { connectionOptions, logger } = parameters;

    this.#boundErrorEventHandler = this.#errorEventHandler.bind(this);
    this.#boundConnectionEventHandler = this.#connectionEventHandler.bind(this);
    this.#boundBlockEventHandler = this.#blockEventHandler.bind(this);
    this.#boundUnblockedEventHandler = this.#unblockedEventHandler.bind(this);
    this.#boundUndeliveredMessageEventHandler =
      this.#undeliveredMessageEventHandler.bind(this);
    this.#boundConsumerErrorEventHandler =
      this.#consumerErrorEventHandler.bind(this);

    this.#handler = new Connection(connectionOptions)
      .on('error', this.#boundErrorEventHandler)
      .on('connection', this.#boundConnectionEventHandler)
      .on('connection.blocked', this.#boundBlockEventHandler)
      .on('connection.unblocked', this.#boundUnblockedEventHandler);
    this.#logger = logger;

    this.#publishers = {};
    this.#consumers = [];

    this.#isAlive = false;
    this.#isReady = false;
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
    const newPublishers = Object.fromEntries(
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
          .on('basic.return', this.#boundUndeliveredMessageEventHandler);

        return [publisherName, publisher] as const;
      }),
    );

    this.#publishers = {
      ...this.#publishers,
      ...newPublishers,
    } as const;

    return this;
  }

  public createConsumer(
    consumerProperties: Pick<
      ConsumerProps,
      'concurrency' | 'exclusive' | 'qos'
    > & {
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
    } = consumerProperties;

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
      .on('error', this.#boundConsumerErrorEventHandler);

    this.#consumers.push(consumer);

    return this;
  }

  public async publish(parameters: {
    publisher: Publishers[number];
    exchange: Exchanges[number];
    routingKey: RoutingKeys[keyof RoutingKeys][number];
    data: Buffer | string | object;
    options: Omit<Envelope, 'exchange' | 'routingKey' | 'correlationId'> & {
      correlationId?: (typeof CORRELATION_IDS)[keyof typeof CORRELATION_IDS];
    };
  }) {
    const { publisher, exchange, routingKey, data, options } = parameters;

    await this.#publishers[publisher]!.send(
      { ...options, exchange, routingKey },
      data,
    );
  }

  public isAlive() {
    return this.#isAlive;
  }

  public isReady() {
    return this.isAlive() && this.#isReady;
  }

  public async close() {
    this.#isAlive = false;
    this.#isReady = false;

    let results = await Promise.allSettled(
      Object.values(this.#publishers).map(async (publisher) => {
        await publisher
          .removeListener(
            'basic-return',
            this.#boundUndeliveredMessageEventHandler,
          )
          .close();
      }),
    );
    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.error('Failure to close publisher:', result.reason);
      }
    });

    results = await Promise.allSettled(
      this.#consumers.map(async (consumer) => {
        await consumer
          .removeListener('error', this.#boundConsumerErrorEventHandler)
          .close();
      }),
    );
    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.error('Failure to close consumer:', result.reason);
      }
    });

    try {
      await this.#handler
        .removeListener(
          'connection.unblocked',
          this.#boundUnblockedEventHandler,
        )
        .removeListener('connection.blocked', this.#boundBlockEventHandler)
        .removeListener('connection', this.#boundConnectionEventHandler)
        .removeListener('error', this.#boundErrorEventHandler)
        .close();
    } catch (error) {
      console.error('Failure to close message queue:', error);
    }
  }

  /********************************************************************************/

  #errorEventHandler(error: unknown) {
    this.#isAlive = false;
    this.#isReady = false;

    this.#logger.error('Error during message queue usage:', error);
  }

  #connectionEventHandler() {
    this.#isAlive = true;
    this.#isReady = true;

    this.#logger.info('Message queue (re)connected');
  }

  #blockEventHandler(reason: unknown) {
    this.#isReady = false;

    this.#logger.error('Message queue is blocked', reason);
  }

  #unblockedEventHandler() {
    this.#isReady = true;

    this.#logger.info('Message queue is unblocked');
  }

  #undeliveredMessageEventHandler(message: ReturnedMessage) {
    this.#logger.error('Message was not delivered:', message);
  }

  #consumerErrorEventHandler(error: unknown) {
    this.#logger.error('Consumer error:', error);
  }
}

/**********************************************************************************/

export {
  CORRELATION_IDS,
  MessageQueue,
  type Consumers,
  type Exchanges,
  type Logger,
  type Publishers,
  type Queues,
  type RoutingKeys,
  type ShowtimeCancellationMessage,
  type TicketCancellationMessage,
  type TicketReservationsMessage,
};
