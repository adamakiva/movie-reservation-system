import { randomUUID } from 'node:crypto';

import {
  CORRELATION_IDS,
  MessageQueue,
  type ShowtimeCancellationMessage,
  type TicketCancellationMessage,
  type TicketReservationsMessage,
} from '@adamakiva/movie-reservation-system-message-queue';
import {
  ERROR_CODES,
  SIGNALS,
} from '@adamakiva/movie-reservation-system-shared';
import { ConsumerStatus, type AsyncMessage } from 'rabbitmq-client';

import { EnvironmentManager } from './config.ts';

/**********************************************************************************/

function startWorker() {
  const {
    messageQueueUrl,
    consumer: { concurrency, prefetchCount },
  } = new EnvironmentManager().getEnvVariables();

  const messageQueue = new MessageQueue({
    connectionOptions: { url: messageQueueUrl },
    logger: console,
  });

  messageQueue.createPublishers({
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
  messageQueue.createConsumer({
    concurrency,
    qos: { prefetchCount },
    routing: {
      exchange: 'mrs',
      queue: 'mrs.ticket.reserve',
      routingKey: 'mrs-ticket-reserve',
    },
    handler: reserveShowtimeTicket.bind(messageQueue),
  });
  messageQueue.createConsumer({
    concurrency,
    qos: { prefetchCount },
    routing: {
      exchange: 'mrs',
      queue: 'mrs.ticket.cancel',
      routingKey: 'mrs-ticket-cancel',
    },
    handler: cancelShowtimeTicket.bind(messageQueue),
  });
  messageQueue.createConsumer({
    concurrency,
    qos: { prefetchCount },
    routing: {
      exchange: 'mrs',
      queue: 'mrs.showtime.cancel',
      routingKey: 'mrs-showtime-cancel',
    },
    handler: cancelShowtime.bind(messageQueue),
  });

  attachProcessHandlers(messageQueue);
}

/**********************************************************************************/

async function reserveShowtimeTicket(
  this: MessageQueue,
  message: Omit<AsyncMessage, 'body'> & { body: TicketReservationsMessage },
) {
  const { correlationId, body } = message;

  if (correlationId !== CORRELATION_IDS.TICKET_RESERVATION) {
    return ConsumerStatus.DROP;
  }
  const { userShowtimeId, userDetails, movieDetails } = body;

  // TODO Payment processing, on failure return a null transactionId so the
  // ph entry in the database can be removed
  const transactionId = randomUUID();

  // TODO Send email receipt
  console.info(userShowtimeId, userDetails, movieDetails);

  await this.publish({
    publisher: 'ticket',
    exchange: 'mrs',
    routingKey: 'mrs-ticket-reserve-reply-to',
    data: {
      ...body,
      transactionId,
    },
    options: {
      durable: true,
      mandatory: true,
      correlationId,
      contentType: 'application/json',
    },
  });

  return ConsumerStatus.ACK;
}

async function cancelShowtimeTicket(
  this: MessageQueue,
  message: Omit<AsyncMessage, 'body'> & { body: TicketCancellationMessage },
) {
  const { correlationId, body } = message;

  if (correlationId !== CORRELATION_IDS.TICKET_CANCELLATION) {
    return ConsumerStatus.DROP;
  }
  const { showtimeId, userIds } = body;

  // TODO Refund processing
  console.info(showtimeId, userIds);

  await this.publish({
    publisher: 'ticket',
    exchange: 'mrs',
    routingKey: 'mrs-ticket-cancel-reply-to',
    data: body,
    options: {
      durable: true,
      mandatory: true,
      correlationId,
      contentType: 'application/json',
    },
  });

  return ConsumerStatus.ACK;
}

async function cancelShowtime(
  this: MessageQueue,
  message: Omit<AsyncMessage, 'body'> & {
    body: ShowtimeCancellationMessage;
  },
) {
  const { correlationId, body } = message;

  if (correlationId !== CORRELATION_IDS.SHOWTIME_CANCELLATION) {
    return ConsumerStatus.DROP;
  }
  const { showtimeId, userIds } = body;

  // TODO Refund processing
  console.info(showtimeId, userIds);

  await this.publish({
    publisher: 'showtime',
    exchange: 'mrs',
    routingKey: 'mrs-showtime-cancel-reply-to',
    data: body,
    options: {
      durable: true,
      mandatory: true,
      correlationId,
      contentType: 'application/json',
    },
  });

  return ConsumerStatus.ACK;
}

/**********************************************************************************/

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
