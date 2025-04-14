import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { eq } from 'drizzle-orm';

import { type RequestContext, GeneralError } from '../../../utils/index.ts';

import type { DeleteHallValidatedData } from './utils.ts';

/**********************************************************************************/

async function deleteHall(
  context: RequestContext,
  hallId: DeleteHallValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { hall: hallModel, showtime: showtimeModel } = database.getModels();

  // Not using a CTE because we won't be to tell whether nothing was deleted due
  // to having an attached showtime or because it does not exist
  await handler.transaction(async (transaction) => {
    // Only halls without attached showtimes are allowed to be deleted
    const hasShowtimes = await transaction.$count(
      showtimeModel,
      eq(showtimeModel.hallId, hallId),
    );
    if (hasShowtimes) {
      throw new GeneralError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        'Hall has one or more attached showtime(s)',
      );
    }

    // I've decided that if nothing was deleted because it didn't exist in the
    // first place, it is still considered as a success since the end result
    // is the same
    await transaction.delete(hallModel).where(eq(hallModel.id, hallId));
  });
}

/*********************************************************************************/

export { deleteHall };
