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
    return this.#isAlive;
  }

  public isReady() {
    return this.isAlive() && this.#isReady;
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
