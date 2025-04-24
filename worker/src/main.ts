import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import Stream from 'node:stream';

import {
  ERROR_CODES,
  SIGNALS,
  type ShowtimeCancellationMessage,
  type TicketCancellationMessage,
  type TicketReservationsMessage,
} from '@adamakiva/movie-reservation-system-shared';
import {
  ConsumerStatus,
  type AsyncMessage,
  type Publisher,
} from 'rabbitmq-client';

import { MessageQueue } from './message.queue.ts';

/**********************************************************************************/

function startWorker() {
  const messageQueueUrl = process.env.MESSAGE_QUEUE_URL;
  if (!messageQueueUrl) {
    throw new Error('Missing message queue url');
  }

  setGlobalValues();

  const messageQueue = new MessageQueue({
    url: messageQueueUrl,
  });

  const publishers = messageQueue.createPublishers({
    ticket: {
      confirm: true,
      maxAttempts: 32,
      routing: [
        {
          exchange: 'mrs',
          queue: 'mrs.ticket.reserve.reply.to',
          routingKey: 'mrs-ticket-reserve-reply-to',
        },
        {
          exchange: 'mrs',
          queue: 'mrs.ticket.cancel.reply.to',
          routingKey: 'mrs-ticket-cancel-reply-to',
        },
      ],
    },
    showtime: {
      confirm: true,
      maxAttempts: 32,
      routing: [
        {
          exchange: 'mrs',
          queue: 'mrs.showtime.cancel.reply.to',
          routingKey: 'mrs-showtime-cancel-reply-to',
        },
      ],
    },
  });

  createReserveTicketConsumer(messageQueue, publishers.ticket!);
  createCancelShowtimeConsumer(messageQueue, publishers.showtime!);
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
      exchange: 'mrs',
      queue: 'mrs.ticket.reserve',
      routingKey: 'mrs-ticket-reserve',
    },
    handler: async (
      message: Omit<AsyncMessage, 'body'> & { body: TicketReservationsMessage },
    ) => {
      const { correlationId, replyTo, body } = message;

      if (!replyTo || !correlationId) {
        return ConsumerStatus.DROP;
      }
      const { userShowtimeId, userDetails, movieDetails } = body;

      // TODO Payment processing, on failure return a null transactionId so the
      // ph entry in the database can be removed
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
        {
          ...body,
          transactionId,
        },
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
      exchange: 'mrs',
      queue: 'mrs.ticket.cancel',
      routingKey: 'mrs-ticket-cancel',
    },
    handler: async (
      message: Omit<AsyncMessage, 'body'> & { body: TicketCancellationMessage },
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
        body,
      );

      return ConsumerStatus.ACK;
    },
  });
}

function createCancelShowtimeConsumer(
  messageQueue: MessageQueue,
  showtimePublisher: Publisher,
) {
  messageQueue.createConsumer({
    routing: {
      exchange: 'mrs',
      queue: 'mrs.showtime.cancel',
      routingKey: 'mrs-showtime-cancel',
    },
    handler: async (
      message: Omit<AsyncMessage, 'body'> & {
        body: ShowtimeCancellationMessage;
      },
    ) => {
      const { correlationId, replyTo, body } = message;

      if (!replyTo || !correlationId) {
        return ConsumerStatus.DROP;
      }
      const { showtimeId, userIds } = body;

      // TODO Refund processing
      console.log(showtimeId, userIds);

      await showtimePublisher.send(
        {
          durable: true,
          mandatory: true,
          correlationId,
          contentType: 'application/json',
          routingKey: replyTo,
        },
        body,
      );

      return ConsumerStatus.ACK;
    },
  });
}

/**********************************************************************************/

function setGlobalValues() {
  // See: https://nodejs.org/api/events.html#capture-rejections-of-promises
  EventEmitter.captureRejections = true;

  const defaultHighWaterMark = Number(process.env.NODE_DEFAULT_HIGH_WATERMARK);
  if (isNaN(defaultHighWaterMark)) {
    Stream.setDefaultHighWaterMark(false, defaultHighWaterMark);
  } else {
    Stream.setDefaultHighWaterMark(false, 65_536);
  }
}

function attachProcessHandlers(messageQueue: MessageQueue) {
  const errorHandler = () => {
    messageQueue
      .close()
      .catch((error: unknown) => {
        console.error('Shutdown failure:', error);
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
