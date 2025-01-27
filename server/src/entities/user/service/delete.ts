import { count, eq } from 'drizzle-orm';

import {
  type RequestContext,
  GeneralError,
  HTTP_STATUS_CODES,
} from '../../../utils/index.js';

import type { DeleteUserValidatedData } from './utils.js';

/**********************************************************************************/

async function deleteUser(
  context: RequestContext,
  userId: DeleteUserValidatedData,
): Promise<void> {
  await deleteUserFromDatabase(context.database, userId);
}

/**********************************************************************************/

async function deleteUserFromDatabase(
  database: RequestContext['database'],
  userId: DeleteUserValidatedData,
) {
  const handler = database.getHandler();
  const { user: userModel, userShowtime: userShowtimeModel } =
    database.getModels();

  // Only users without attached showtimes are allowed to be deleted
  const userShowtimes = (
    await handler
      .select({ count: count() })
      .from(userShowtimeModel)
      .where(eq(userShowtimeModel.userId, userId))
  )[0]!.count;
  if (userShowtimes) {
    throw new GeneralError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'User has one or more attached showtime(s)',
    );
  }

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  await handler.delete(userModel).where(eq(userModel.id, userId));
}

/**********************************************************************************/

export { deleteUser };
