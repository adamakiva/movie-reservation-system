import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { eq } from 'drizzle-orm';

import { type RequestContext, GeneralError } from '../../../utils/index.ts';

import type { DeleteUserValidatedData } from './utils.ts';

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
    const hasShowtimes = await transaction.$count(
      userShowtimeModel,
      eq(userShowtimeModel.userId, userId),
    );
    if (hasShowtimes) {
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
