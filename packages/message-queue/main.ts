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

const CORRELATION_IDS = {
  TICKET_RESERVATION: 'ticket.reserve',
  TICKET_CANCELLATION: 'ticket.cancel',
  SHOWTIME_CANCELLATION: 'showtime.cancel',
};

type PublishOptions = Omit<
  Envelope,
  'exchange' | 'routingKey' | 'correlationId'
> & {
  correlationId?: (typeof CORRELATION_IDS)[keyof typeof CORRELATION_IDS];
};

type Logger = {
  // eslint-disable-next-line no-unused-vars
  info: (...args: unknown[]) => void;
  // eslint-disable-next-line no-unused-vars
  error: (...args: unknown[]) => void;
};

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
  readonly #handler;
  readonly #logger;

  readonly #boundErrorEventHandler;
  readonly #boundConnectionEventHandler;
  readonly #boundBlockEventHandler;
  readonly #boundUnblockedEventHandler;
  readonly #boundUndeliveredMessageEventHandler;
  readonly #boundConsumerErrorEventHandler;

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
            .on('basic.return', this.#boundUndeliveredMessageEventHandler);

          return [publisherName, publisher] as const;
        }),
      ),
    };

    return this;
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
      .on('error', this.#boundConsumerErrorEventHandler);

    this.#consumers.push(consumer);

    return this;
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
    return this.#isAlive;
  }

  public isReady() {
    return this.isAlive() && this.#isReady;
  }

  public async close() {
    this.#isAlive = false;
    this.#isReady = false;

    await Promise.allSettled(
      Object.values(this.#publishers).map(async (publisher) => {
        try {
          await publisher
            .removeListener(
              'basic-return',
              this.#boundUndeliveredMessageEventHandler,
            )
            .close();
        } catch (error) {
          console.error('Failure to close publisher:', error);
        }
      }),
    );

    await Promise.allSettled(
      this.#consumers.map(async (consumer) => {
        try {
          await consumer
            .removeListener('error', this.#boundConsumerErrorEventHandler)
            .close();
        } catch (error) {
          console.error('Failure to close consumer:', error);
        }
      }),
    );

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
  type Publishers,
  type Queues,
  type RoutingKeys,
  type ShowtimeCancellationMessage,
  type TicketCancellationMessage,
  type TicketReservationsMessage,
};
