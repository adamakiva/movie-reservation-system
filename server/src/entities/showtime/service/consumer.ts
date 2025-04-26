import {
  CORRELATION_IDS,
  type ShowtimeCancellationMessage,
  type TicketCancellationMessage,
  type TicketReservationsMessage,
} from '@adamakiva/movie-reservation-system-message-queue';
import type {
  TicketCancellationWebsocketMessages,
  TicketReservationWebsocketMessage,
} from '@adamakiva/movie-reservation-system-shared';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { ConsumerStatus, type AsyncMessage } from 'rabbitmq-client';

import type { WebsocketServer } from '../../../server/services/index.ts';
import type { RequestContext } from '../../../utils/types.ts';

/**********************************************************************************/

function reserveShowtimeTicket(params: {
  database: RequestContext['database'];
  websocketServer: WebsocketServer;
  logger: RequestContext['logger'];
}) {
  const { database, websocketServer, logger } = params;

  return async (
    message: Omit<AsyncMessage, 'body'> & {
      body: TicketReservationsMessage & { transactionId?: string | undefined };
    },
  ) => {
    const { correlationId, body } = message;

    if (correlationId !== CORRELATION_IDS.TICKET_RESERVATION) {
      return ConsumerStatus.DROP;
    }
    const {
      showtimeId,
      movieDetails: { row, column },
      userShowtimeId,
      transactionId,
    } = body;

    const handler = database.getHandler();
    const { userShowtime: userShowtimeModel } = database.getModels();

    const filter = eq(userShowtimeModel.id, userShowtimeId);
    if (transactionId) {
      await handler
        .update(userShowtimeModel)
        .set({ transactionId })
        .where(filter);

      broadcastReserveTicketMessages({
        websocketServer,
        showtimeId,
        row,
        column,
        logger,
      });
    } else {
      await handler.delete(userShowtimeModel).where(filter);
    }

    return ConsumerStatus.ACK;
  };
}

function cancelShowtimeReservations(params: {
  database: RequestContext['database'];
  websocketServer: WebsocketServer;
  logger: RequestContext['logger'];
}) {
  const { database, websocketServer, logger } = params;

  return async (
    message: Omit<AsyncMessage, 'body'> & { body: TicketCancellationMessage },
  ) => {
    const { correlationId, body } = message;

    if (correlationId !== CORRELATION_IDS.SHOWTIME_CANCELLATION) {
      return ConsumerStatus.DROP;
    }
    const { showtimeId, userIds } = body;

    const handler = database.getHandler();
    const { userShowtime: userShowtimeModel } = database.getModels();

    const tickets = await handler
      .delete(userShowtimeModel)
      .where(
        and(
          eq(userShowtimeModel.showtimeId, showtimeId),
          // Only delete confirmed reservations (Reservations which were payed for)
          isNotNull(userShowtimeModel.transactionId),
          !Array.isArray(userIds)
            ? eq(userShowtimeModel.userId, userIds)
            : inArray(userShowtimeModel.userId, userIds),
        ),
      )
      .returning({
        row: userShowtimeModel.row,
        column: userShowtimeModel.column,
      });
    if (tickets.length) {
      broadcastCancelTicketsMessages({
        websocketServer,
        showtimeId,
        tickets,
        logger,
      });
    }

    return ConsumerStatus.ACK;
  };
}

function cancelShowtime(database: RequestContext['database']) {
  return async (
    message: Omit<AsyncMessage, 'body'> & { body: ShowtimeCancellationMessage },
  ) => {
    const { correlationId, body } = message;

    if (correlationId !== CORRELATION_IDS.TICKET_CANCELLATION) {
      return ConsumerStatus.DROP;
    }

    const { showtimeId } = body;

    const handler = database.getHandler();
    const { showtime: showtimeModel, userShowtime: userShowtimeModel } =
      database.getModels();

    // Don't `Promise.all()`, the reservations must be deleted before the showtime
    await handler
      .delete(userShowtimeModel)
      .where(eq(userShowtimeModel.showtimeId, showtimeId));
    await handler
      .delete(showtimeModel)
      .where(
        and(
          eq(showtimeModel.id, showtimeId),
          eq(showtimeModel.markedForDeletion, true),
        ),
      );

    return ConsumerStatus.ACK;
  };
}

/**********************************************************************************/

function broadcastReserveTicketMessages(params: {
  websocketServer: WebsocketServer;
  showtimeId: string;
  row: number;
  column: number;
  logger: RequestContext['logger'];
}) {
  const { websocketServer, showtimeId, row, column, logger } = params;

  websocketServer.broadcast(
    JSON.stringify({
      action: 'reserve',
      showtimeId,
      row,
      column,
    } satisfies TicketReservationWebsocketMessage),
    {},
    (error) => {
      logger.error('Failure to write socket message:', error);
    },
  );
}

function broadcastCancelTicketsMessages(params: {
  websocketServer: WebsocketServer;
  showtimeId: string;
  tickets: { row: number; column: number }[];
  logger: RequestContext['logger'];
}) {
  const { websocketServer, showtimeId, tickets, logger } = params;

  const rows: number[] = [];
  const columns: number[] = [];
  tickets.forEach(({ row, column }) => {
    rows.push(row);
    columns.push(column);
  });

  websocketServer.broadcast(
    JSON.stringify({
      action: 'cancel',
      showtimeId,
      rows,
      columns,
    } satisfies TicketCancellationWebsocketMessages),
    {},
    (error) => {
      logger.error('Failure to write socket message:', error);
    },
  );
}

/**********************************************************************************/

export { cancelShowtime, cancelShowtimeReservations, reserveShowtimeTicket };
