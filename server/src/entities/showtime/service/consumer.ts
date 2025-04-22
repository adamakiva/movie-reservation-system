import { MESSAGE_QUEUE } from '@adamakiva/movie-reservation-system-shared';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { ConsumerStatus, type AsyncMessage } from 'rabbitmq-client';

import type { RequestContext } from '../../../utils/types.ts';

/**********************************************************************************/

type ReserveShowtimeTicketMessage = Omit<AsyncMessage, 'body'> & {
  body: {
    showtimeId: string;
    row: number;
    column: number;
    userShowtimeId: string;
    transactionId: string;
  };
};
type CancelShowtimeTicketsMessage = Omit<AsyncMessage, 'body'> & {
  body: {
    showtimeId: string;
    userIds: string | string[];
  };
};

/**********************************************************************************/

function reserveShowtimeTicket(params: {
  database: RequestContext['database'];
  websocketServer: RequestContext['websocketServer'];
  logger: RequestContext['logger'];
}) {
  const { database, websocketServer, logger } = params;

  return async (message: ReserveShowtimeTicketMessage) => {
    const { correlationId, body } = message;

    if (correlationId !== MESSAGE_QUEUE.TICKET.RESERVE.CORRELATION_ID) {
      return ConsumerStatus.DROP;
    }
    const { showtimeId, row, column, userShowtimeId, transactionId } = body;

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
  websocketServer: RequestContext['websocketServer'];
  logger: RequestContext['logger'];
}) {
  const { database, websocketServer, logger } = params;

  return async (message: CancelShowtimeTicketsMessage) => {
    const { correlationId, body } = message;

    if (correlationId !== MESSAGE_QUEUE.TICKET.CANCEL.CORRELATION_ID) {
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

function broadcastReserveTicketMessages(params: {
  websocketServer: RequestContext['websocketServer'];
  showtimeId: string;
  row: number;
  column: number;
  logger: RequestContext['logger'];
}) {
  const { websocketServer, showtimeId, row, column, logger } = params;

  websocketServer.broadcast(
    JSON.stringify({ action: 'reserve', showtimeId, row, column }),
    {},
    (err) => {
      logger.error('Failure to write socket message:', err);
    },
  );
}

function broadcastCancelTicketsMessages(params: {
  websocketServer: RequestContext['websocketServer'];
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
    JSON.stringify({ action: 'cancel', showtimeId, rows, columns }),
    {},
    (err) => {
      logger.error('Failure to write socket message:', err);
    },
  );
}

/**********************************************************************************/

export { cancelShowtimeReservations, reserveShowtimeTicket };
