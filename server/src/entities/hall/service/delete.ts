import { count, eq } from 'drizzle-orm';

import {
  type RequestContext,
  GeneralError,
  HTTP_STATUS_CODES,
} from '../../../utils/index.js';

import type { DeleteHallValidatedData } from './utils.js';

/**********************************************************************************/

async function deleteHall(
  context: RequestContext,
  hallId: DeleteHallValidatedData,
): Promise<void> {
  await deleteHallFromDatabase(context.database, hallId);
}

/**********************************************************************************/

async function deleteHallFromDatabase(
  database: RequestContext['database'],
  hallId: DeleteHallValidatedData,
) {
  const handler = database.getHandler();
  const { hall: hallModel, showtime: showtimeModel } = database.getModels();

  // Only halls without attached showtimes are allowed to be deleted
  const showtimesWithDeletedHall = (
    await handler
      .select({ count: count() })
      .from(showtimeModel)
      .where(eq(showtimeModel.hallId, hallId))
  )[0]!.count;
  if (showtimesWithDeletedHall) {
    throw new GeneralError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'Hall has one or more attached showtime',
    );
  }

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  await handler.delete(hallModel).where(eq(hallModel.id, hallId));
}

/*********************************************************************************/

export { deleteHall };
