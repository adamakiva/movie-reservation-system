import { and, eq } from 'drizzle-orm';
import type { Request } from 'express';

import type {
  DatabaseHandler,
  DatabaseModel,
  RequestContext,
} from '../../../utils/index.js';

import type {
  CancelUserShowtimeValidatedData,
  DeleteShowtimeValidatedData,
} from './utils.js';

/**********************************************************************************/

async function deleteShowtime(
  context: RequestContext,
  showtimeId: DeleteShowtimeValidatedData,
): Promise<void> {
  await deleteShowtimeFromDatabase(context.database, showtimeId);
}

async function cancelUserShowtimeReservation(params: {
  req: Request;
  context: RequestContext;
  showtimeId: CancelUserShowtimeValidatedData;
}) {
  const {
    req,
    context: { database, authentication },
    showtimeId,
  } = params;
  const handler = database.getHandler();
  const { userShowtime: userShowtimeModel } = database.getModels();

  const userId = authentication.getUserId(req.headers.authorization!);

  await cancelShowtimeReservation({
    handler,
    userShowtimeModel,
    showtimeId,
    userId,
  });
}

/**********************************************************************************/

async function deleteShowtimeFromDatabase(
  database: RequestContext['database'],
  showtimeId: DeleteShowtimeValidatedData,
) {
  const handler = database.getHandler();
  const { showtime: showtimeModel, userShowtime: userShowtimeModel } =
    database.getModels();

  // When removing a showtime we need to cancel all reservations
  const userIds = (
    await handler
      .select({ userId: userShowtimeModel.userId })
      .from(userShowtimeModel)
      .where(eq(userShowtimeModel.showtimeId, showtimeId))
  ).map(({ userId }) => {
    return userId;
  });
  if (!userIds.length) {
    await deleteShowtimeEntry({ handler, showtimeModel, showtimeId });
    return;
  }

  await cancelShowtimeReservations({
    handler,
    models: { showtimeModel, userShowtimeModel },
    showtimeId,
    userIds,
  });
}

/**********************************************************************************/

async function cancelShowtimeReservations(params: {
  handler: DatabaseHandler;
  models: {
    showtimeModel: DatabaseModel<'showtime'>;
    userShowtimeModel: DatabaseModel<'userShowtime'>;
  };
  showtimeId: string;
  userIds: string[];
}) {
  const {
    handler,
    models: { showtimeModel, userShowtimeModel },
    showtimeId,
    userIds,
  } = params;

  await handler.transaction(async (transaction) => {
    await Promise.all(
      userIds.map(async (userId) => {
        await cancelShowtimeReservation({
          handler: transaction,
          userShowtimeModel,
          showtimeId,
          userId,
        });
      }),
    );

    await deleteShowtimeEntry({
      handler: transaction,
      showtimeModel,
      showtimeId,
    });
  });
}

async function cancelShowtimeReservation(params: {
  handler: DatabaseHandler;
  userShowtimeModel: DatabaseModel<'userShowtime'>;
  showtimeId: string;
  userId: string;
}) {
  const { handler, userShowtimeModel, showtimeId, userId } = params;

  // TODO Send the refund request to the message queue

  await handler
    .delete(userShowtimeModel)
    .where(
      and(
        eq(userShowtimeModel.showtimeId, showtimeId),
        eq(userShowtimeModel.userId, userId),
      ),
    );
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
