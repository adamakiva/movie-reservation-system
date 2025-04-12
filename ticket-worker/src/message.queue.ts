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

  #publishers: { [key: string]: Publisher };
  readonly #consumers: Consumer[];

  readonly #connectionEventHandlers;
  readonly #publisherEventHandlers;
  readonly #consumerEventHandlers;

  public constructor(connectionOptions: ConnectionOptions) {
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

    this.#handler = new Connection(connectionOptions);
    this.#connectionEventHandlers.forEach(([name, handler]) => {
      //@ts-expect-error Typescript can't infer the type since Object.entries()
      // keys are not generic. It works
      this.#handler.on(name, handler);
    });

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

  /********************************************************************************/

  #handleErrorEvent(err: unknown) {
    console.error('Error during message queue usage:', err);
  }

  #handleConnectionEvent() {
    console.info('Message queue (re)connected');
  }

  #handleBlockedEvent(reason: unknown) {
    console.error('Message queue is blocked:', reason);
  }

  #handleUnblockedEvent() {
    console.info('Message queue is unblocked');
  }

  #handleUndeliveredMessageEvent(message: ReturnedMessage) {
    console.error('Message was not delivered:', message);
  }

  #handleConsumerErrorEvent(err: unknown) {
    console.error('Consumer error:', err);
  }
}

/**********************************************************************************/

export default MessageQueue;
