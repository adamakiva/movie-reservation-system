import type {
  Exchanges,
  Publishers,
  WorkerConsumersQueues,
  WorkerConsumersRoutingKeys,
  WorkerPublishersQueues,
  WorkerPublishersRoutingKeys,
} from '@adamakiva/movie-reservation-system-shared';
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

class MessageQueue<E extends Exchanges[number] = Exchanges[number]> {
  readonly #handler;

  #publishers: { [key: string]: Publisher } = {};
  readonly #consumers: Consumer[] = [];

  public constructor(connectionOptions: ConnectionOptions) {
    this.#handler = new Connection(connectionOptions)
      .on('error', this.#handleErrorEvent)
      .on('connection', this.#handleConnectionEvent)
      .on('connection.blocked', this.#handleBlockedEvent)
      .on('connection.unblocked', this.#handleUnblockedEvent);
  }

  public createPublishers(publishers: {
    // eslint-disable-next-line no-unused-vars
    [K in Publishers[number]]: Pick<
      PublisherProps,
      'confirm' | 'maxAttempts'
    > & {
      routing: {
        exchange: E;
        queue: WorkerPublishersQueues[E][number];
        routingKey: WorkerPublishersRoutingKeys[E][number];
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

    return this.#publishers;
  }

  public createConsumer(
    consumerProps: Pick<ConsumerProps, 'concurrency' | 'exclusive' | 'qos'> & {
      routing: {
        exchange: E;
        queue: WorkerConsumersQueues[E][number];
        routingKey: WorkerConsumersRoutingKeys[E][number];
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
    ] as const;
    const queueBindings: ConsumerProps['queueBindings'] = [
      { exchange, queue, routingKey },
    ] as const;

    const consumer = this.#handler
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
      .on('error', this.#handleConsumerErrorEvent);

    this.#consumers.push(consumer);
  }

  public async close() {
    try {
      await Promise.all(
        Object.values(this.#publishers).map(async (publisher) => {
          await publisher.close();
          publisher.removeListener(
            'basic-return',
            this.#handleUndeliveredMessageEvent,
          );
        }),
      );
    } catch (error) {
      console.error('Failure to shutdown publisher(s):', error);
    }

    try {
      await Promise.all(
        this.#consumers.map(async (consumer) => {
          await consumer.close();
          consumer.removeListener('error', this.#handleConsumerErrorEvent);
        }),
      );
    } catch (error) {
      console.error('Failure to shutdown consumer(s):', error);
    }

    try {
      await this.#handler.close();
      this.#handler
        .removeListener('connection.unblocked', this.#handleUnblockedEvent)
        .removeListener('connection.blocked', this.#handleBlockedEvent)
        .removeListener('connection', this.#handleConnectionEvent)
        .removeListener('error', this.#handleErrorEvent);
    } catch (error) {
      console.error('Failure to close message queue connection:', error);
    }
  }

  /********************************************************************************/

  readonly #handleErrorEvent = (error: unknown) => {
    console.error('Error during message queue usage:', error);
  };

  readonly #handleConnectionEvent = () => {
    console.info('Message queue (re)connected');
  };

  readonly #handleBlockedEvent = (reason: unknown) => {
    console.error('Message queue is blocked:', reason);
  };

  readonly #handleUnblockedEvent = () => {
    console.info('Message queue is unblocked');
  };

  readonly #handleUndeliveredMessageEvent = (message: ReturnedMessage) => {
    console.error('Message was not delivered:', message);
  };

  readonly #handleConsumerErrorEvent = (error: unknown) => {
    console.error('Consumer error:', error);
  };
}

/**********************************************************************************/

export { MessageQueue };
