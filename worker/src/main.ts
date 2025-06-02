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

  messageQueue
    .createPublishers({
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
    })
    .createConsumer({
      concurrency,
      qos: { prefetchCount },
      routing: {
        exchange: 'mrs',
        queue: 'mrs.ticket.reserve',
        routingKey: 'mrs-ticket-reserve',
      },
      handler: reserveShowtimeTicket(messageQueue),
    })
    .createConsumer({
      concurrency,
      qos: { prefetchCount },
      routing: {
        exchange: 'mrs',
        queue: 'mrs.ticket.cancel',
        routingKey: 'mrs-ticket-cancel',
      },
      handler: cancelShowtimeTicket(messageQueue),
    })
    .createConsumer({
      concurrency,
      qos: { prefetchCount },
      routing: {
        exchange: 'mrs',
        queue: 'mrs.showtime.cancel',
        routingKey: 'mrs-showtime-cancel',
      },
      handler: cancelShowtime(messageQueue),
    });

  attachProcessHandlers(messageQueue);
}

/**********************************************************************************/

function reserveShowtimeTicket(messageQueue: MessageQueue) {
  return async function reserverShowtimeTicket(
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

    await messageQueue.publish({
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
  };
}

function cancelShowtimeTicket(messageQueue: MessageQueue) {
  return async function cancelShowtimeTicket(
    message: Omit<AsyncMessage, 'body'> & { body: TicketCancellationMessage },
  ) {
    const { correlationId, body } = message;

    if (correlationId !== CORRELATION_IDS.TICKET_CANCELLATION) {
      return ConsumerStatus.DROP;
    }
    const { showtimeId, userIds } = body;

    // TODO Refund processing
    console.info(showtimeId, userIds);

    await messageQueue.publish({
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
  };
}

function cancelShowtime(messageQueue: MessageQueue) {
  return async function cancelShowtime(
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

    await messageQueue.publish({
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
  };
}

/**********************************************************************************/

function attachProcessHandlers(messageQueue: MessageQueue) {
  async function errorHandler(error: unknown) {
    if (error) {
      console.error(`Unhandled error/rejection:`, error);
    }

    try {
      await messageQueue.close();
    } catch (error) {
      console.error('Shutdown failure:', error);
    } finally {
      process.exit(ERROR_CODES.EXIT_NO_RESTART);
    }
  }

  process
    .on('warning', console.warn)
    .once('unhandledRejection', errorHandler)
    .once('uncaughtException', errorHandler);

  SIGNALS.forEach((signal) => {
    process.once(signal, errorHandler);
  });
}

/**********************************************************************************/

startWorker();
