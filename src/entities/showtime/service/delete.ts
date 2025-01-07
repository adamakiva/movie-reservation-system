import { type RequestContext, eq } from '../../../utils/index.js';

import type { DeleteShowtimeValidatedData } from './utils.js';

/**********************************************************************************/

async function deleteShowtime(
  context: RequestContext,
  showtimeId: DeleteShowtimeValidatedData,
): Promise<void> {
  await deleteShowtimeFromDatabase(context.database, showtimeId);
}

/**********************************************************************************/

async function deleteShowtimeFromDatabase(
  database: RequestContext['database'],
  showtimeId: DeleteShowtimeValidatedData,
) {
  const handler = database.getHandler();
  const { showtime: showtimeModel } = database.getModels();

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  await handler.delete(showtimeModel).where(eq(showtimeModel.id, showtimeId));
}

/**********************************************************************************/

export { deleteShowtime };
