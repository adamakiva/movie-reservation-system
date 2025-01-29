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
  const { database } = context;
  const handler = database.getHandler();
  const { user: userModel, userShowtime: userShowtimeModel } =
    database.getModels();

  // Not using a CTE because we won't be to tell whether nothing was deleted due
  // to having an attached movie or because it does not exist
  await handler.transaction(async (transaction) => {
    // Only users without attached showtimes are allowed to be deleted
    const userShowtimes = (
      await transaction
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
    await transaction.delete(userModel).where(eq(userModel.id, userId));
  });
}

/**********************************************************************************/

export { deleteUser };
