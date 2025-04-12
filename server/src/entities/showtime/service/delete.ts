import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';

import {
  GeneralError,
  type DatabaseHandler,
  type DatabaseModel,
  type RequestContext,
} from '../../../utils/index.ts';

import type {
  CancelUserShowtimeValidatedData,
  DeleteShowtimeValidatedData,
} from './utils.ts';

/**********************************************************************************/

async function deleteShowtime(
  context: RequestContext,
  showtimeId: DeleteShowtimeValidatedData,
): Promise<void> {
  const { database, messageQueue } = context;
  const handler = database.getHandler();
  const { showtime: showtimeModel, userShowtime: userShowtimeModel } =
    database.getModels();

  await handler.transaction(async (transaction) => {
    // When removing a showtime we need to cancel all reservations
    const userIds = (
      await transaction
        .select({ userId: userShowtimeModel.userId })
        .from(userShowtimeModel)
        .where(eq(userShowtimeModel.showtimeId, showtimeId))
    ).map(({ userId }) => {
      return userId;
    });
    if (!userIds.length) {
      await deleteShowtimeEntry({
        handler: transaction,
        showtimeModel,
        showtimeId,
      });
      return;
    }

    await cancelShowtimeReservations({
      handler: transaction,
      messageQueue,
      showtimeModel,
      showtimeId,
      userIds,
    });
  });
}

async function cancelUserShowtimeReservation(params: {
  req: Request;
  context: RequestContext;
  showtimeId: CancelUserShowtimeValidatedData;
}) {
  const {
    req,
    context: { authentication, database, messageQueue },
    showtimeId,
  } = params;
  const handler = database.getHandler();
  const { showtime: showtimeModel } = database.getModels();

  const userId = authentication.getUserId(req.headers.authorization!);

  await handler.transaction(async (transaction) => {
    await cancelShowtimeReservation({
      handler: transaction,
      messageQueue,
      showtimeModel,
      showtimeId,
      userIds: userId,
    });
  });
}

/**********************************************************************************/

async function cancelShowtimeReservations(params: {
  handler: DatabaseHandler;
  messageQueue: RequestContext['messageQueue'];
  showtimeModel: DatabaseModel<'showtime'>;
  showtimeId: string;
  userIds: string[];
}) {
  const { handler, messageQueue, showtimeModel, showtimeId, userIds } = params;

  // Don't promise.all here, the user showtimes entries MUST be deleted before
  // deleting the showtime entry
  await cancelShowtimeReservation({
    handler,
    messageQueue,
    showtimeModel,
    showtimeId,
    userIds,
  });
  await deleteShowtimeEntry({
    handler,
    showtimeModel,
    showtimeId,
  });
}

async function cancelShowtimeReservation(params: {
  handler: DatabaseHandler;
  messageQueue: RequestContext['messageQueue'];
  showtimeModel: DatabaseModel<'showtime'>;
  showtimeId: string;
  userIds: string | string[];
}) {
  const { handler, messageQueue, showtimeModel, showtimeId, userIds } = params;

  const [showtime] = await handler
    .select({ at: showtimeModel.at })
    .from(showtimeModel)
    .where(eq(showtimeModel.id, showtimeId));
  if (!showtime) {
    return;
  }

  if (showtime.at <= new Date()) {
    throw new GeneralError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'Unable to cancel a past reservation(s)',
    );
  }

  await messageQueue.publish({
    publisher: 'ticket',
    exchange: 'mrs',
    routingKey: 'mrs-ticket-cancel',
    data: {
      showtimeId,
      userIds,
    },
    options: {
      durable: true,
      mandatory: true,
      replyTo: 'mrs.ticket.cancel.reply.to',
      correlationId: 'cancel',
    },
  });
}

async function deleteShowtimeEntry(params: {
  handler: DatabaseHandler;
  showtimeModel: DatabaseModel<'showtime'>;
  showtimeId: string;
}) {
  const { handler, showtimeModel, showtimeId } = params;
  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  await handler.delete(showtimeModel).where(eq(showtimeModel.id, showtimeId));
}

/**********************************************************************************/

export { cancelUserShowtimeReservation, deleteShowtime };
