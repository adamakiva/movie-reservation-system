import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { and, eq } from 'drizzle-orm';
import type { Locals, Request } from 'express';

import { isForeignKeyViolationError } from '../../../database/index.ts';
import { GeneralError, isError } from '../../../utils/errors.ts';
import type { DatabaseHandler, DatabaseModel } from '../../../utils/types.ts';

import type {
  CancelUserShowtimeValidatedData,
  DeleteShowtimeValidatedData,
} from './utils.ts';

/**********************************************************************************/

async function deleteShowtime(
  context: Locals,
  showtimeId: DeleteShowtimeValidatedData,
): Promise<void> {
  const { database, messageQueue } = context;

  const handler = database.getHandler();
  const { showtime: showtimeModel, userShowtime: userShowtimeModel } =
    database.getModels();

  const [exists] = await handler
    .update(showtimeModel)
    .set({ markedForDeletion: true })
    .where(eq(showtimeModel.id, showtimeId))
    .returning({ id: showtimeModel.id });
  if (!exists) {
    return;
  }

  try {
    await handler
      .delete(showtimeModel)
      .where(
        and(
          eq(showtimeModel.id, showtimeId),
          eq(showtimeModel.markedForDeletion, true),
        ),
      );
  } catch (error) {
    await deleteShowtimeWithAttachedUsers({
      error,
      messageQueue,
      handler,
      userShowtimeModel,
      showtimeId,
    });
  }
}

async function cancelUserShowtimeReservation(params: {
  request: Request;
  context: Locals;
  showtimeId: CancelUserShowtimeValidatedData;
}) {
  const {
    request,
    context: { authentication, database, messageQueue },
    showtimeId,
  } = params;

  const handler = database.getHandler();
  const { showtime: showtimeModel } = database.getModels();

  const userId = authentication.getUserId(request.headers.authorization!);

  await cancelShowtimeReservation({
    handler,
    messageQueue,
    showtimeModel,
    showtimeId,
    userId,
  });
}

/**********************************************************************************/

async function deleteShowtimeWithAttachedUsers(params: {
  error: unknown;
  messageQueue: Locals['messageQueue'];
  handler: DatabaseHandler;
  userShowtimeModel: DatabaseModel<'userShowtime'>;
  showtimeId: string;
}) {
  const { error, messageQueue, handler, userShowtimeModel, showtimeId } =
    params;

  if (!isError(error)) {
    throw new GeneralError(
      HTTP_STATUS_CODES.SERVER_ERROR,
      'Thrown a non error object',
    );
  }
  if (!isForeignKeyViolationError(error)) {
    throw error;
  }

  const userIds = (
    await handler
      .select({ userId: userShowtimeModel.userId })
      .from(userShowtimeModel)
      .where(eq(userShowtimeModel.showtimeId, showtimeId))
  ).map(({ userId }) => {
    return userId;
  });
  await messageQueue.publish({
    publisher: 'ticket',
    exchange: 'mrs',
    routingKey: 'mrs-ticket-cancel',
    data: { showtimeId, userIds },
    options: {
      durable: true,
      mandatory: true,
      correlationId: 'ticket.cancel',
      contentType: 'application/json',
    },
  });
}

async function cancelShowtimeReservation(params: {
  handler: DatabaseHandler;
  messageQueue: Locals['messageQueue'];
  showtimeModel: DatabaseModel<'showtime'>;
  showtimeId: string;
  userId: string;
}) {
  const { handler, messageQueue, showtimeModel, showtimeId, userId } = params;

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
      userIds: userId,
    },
    options: {
      durable: true,
      mandatory: true,
      correlationId: 'ticket.cancel',
      contentType: 'application/json',
    },
  });
}

/**********************************************************************************/

export { cancelUserShowtimeReservation, deleteShowtime };
