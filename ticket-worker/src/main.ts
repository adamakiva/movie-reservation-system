import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

import {
  ERROR_CODES,
  MESSAGE_QUEUE,
  SIGNALS,
} from '@adamakiva/movie-reservation-system-shared';
import {
  ConsumerStatus,
  type AsyncMessage,
  type Publisher,
} from 'rabbitmq-client';

import { MessageQueue } from './message.queue.ts';

/**********************************************************************************/

type TicketReservationsParams = {
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
type TicketCancellationParams = {
  showtimeId: string;
  userIds: string | string[];
};

/**********************************************************************************/

function startWorker() {
  const messageQueueUrl = process.env.MESSAGE_QUEUE_URL;
  if (!messageQueueUrl) {
    throw new Error('Missing message queue url');
  }

  // See: https://nodejs.org/api/events.html#capture-rejections-of-promises
  EventEmitter.captureRejections = true;

  const messageQueue = new MessageQueue({
    url: process.env.MESSAGE_QUEUE_URL!,
  });

  const publishers = messageQueue.createPublishers({
    ticket: {
      confirm: true,
      maxAttempts: 32,
      routing: [
        {
          exchange: MESSAGE_QUEUE.TICKET.RESERVE.CLIENT.EXCHANGE_NAME,
          queue: MESSAGE_QUEUE.TICKET.RESERVE.CLIENT.QUEUE_NAME,
          routingKey: MESSAGE_QUEUE.TICKET.RESERVE.CLIENT.ROUTING_KEY_NAME,
        },
        {
          exchange: MESSAGE_QUEUE.TICKET.CANCEL.CLIENT.EXCHANGE_NAME,
          queue: MESSAGE_QUEUE.TICKET.CANCEL.CLIENT.QUEUE_NAME,
          routingKey: MESSAGE_QUEUE.TICKET.CANCEL.CLIENT.ROUTING_KEY_NAME,
        },
      ],
    },
  });

  createReserveTicketConsumer(messageQueue, publishers.ticket!);
  createCancelTicketConsumer(messageQueue, publishers.ticket!);

  attachProcessHandlers(messageQueue);
}

/**********************************************************************************/

function createReserveTicketConsumer(
  messageQueue: MessageQueue,
  ticketPublisher: Publisher,
) {
  messageQueue.createConsumer({
    routing: {
      exchange: MESSAGE_QUEUE.TICKET.RESERVE.SERVER.EXCHANGE_NAME,
      queue: MESSAGE_QUEUE.TICKET.RESERVE.SERVER.QUEUE_NAME,
      routingKey: MESSAGE_QUEUE.TICKET.RESERVE.SERVER.ROUTING_KEY_NAME,
    },
    handler: async (
      message: Omit<AsyncMessage, 'body'> & { body: TicketReservationsParams },
    ) => {
      const { correlationId, replyTo, body } = message;

      if (!replyTo || !correlationId) {
        return ConsumerStatus.DROP;
      }
      const { userShowtimeId, userDetails, movieDetails } = body;

      // TODO Payment processing
      const transactionId = randomUUID();

      // TODO Send email receipt
      console.log(userShowtimeId, userDetails, movieDetails);

      await ticketPublisher.send(
        {
          durable: true,
          mandatory: true,
          correlationId,
          contentType: 'application/json',
          routingKey: replyTo,
        },
        { userShowtimeId, transactionId },
      );

      return ConsumerStatus.ACK;
    },
  });
}

function createCancelTicketConsumer(
  messageQueue: MessageQueue,
  ticketPublisher: Publisher,
) {
  messageQueue.createConsumer({
    routing: {
      exchange: MESSAGE_QUEUE.TICKET.CANCEL.SERVER.EXCHANGE_NAME,
      queue: MESSAGE_QUEUE.TICKET.CANCEL.SERVER.QUEUE_NAME,
      routingKey: MESSAGE_QUEUE.TICKET.CANCEL.SERVER.ROUTING_KEY_NAME,
    },
    handler: async (
      message: Omit<AsyncMessage, 'body'> & { body: TicketCancellationParams },
    ) => {
      const { correlationId, replyTo, body } = message;

      if (!replyTo || !correlationId) {
        return ConsumerStatus.DROP;
      }
      const { showtimeId, userIds } = body;

      // TODO Refund processing
      console.log(showtimeId, userIds);

      await ticketPublisher.send(
        {
          durable: true,
          mandatory: true,
          correlationId,
          contentType: 'application/json',
          routingKey: replyTo,
        },
        { showtimeId, userIds },
      );

      return ConsumerStatus.ACK;
    },
  });
}

/**********************************************************************************/

function attachProcessHandlers(messageQueue: MessageQueue) {
  const errorHandler = () => {
    messageQueue
      .close()
      .catch((error: unknown) => {
        console.error(error);
      })
      .finally(() => {
        process.exit(ERROR_CODES.EXIT_NO_RESTART);
      });
  };

  process
    .on('warning', console.warn)
    .once('unhandledRejection', (reason) => {
      console.error(`Unhandled rejection:`, reason);
      errorHandler();
    })
    .once('uncaughtException', (error) => {
      console.error(`Unhandled exception:`, error);
      errorHandler();
    });

  SIGNALS.forEach((signal) => {
    process.once(signal, errorHandler);
  });
}

/**********************************************************************************/

startWorker();
