import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { eq } from 'drizzle-orm';

import { GeneralError } from '../../../utils/errors.ts';
import type { RequestContext } from '../../../utils/types.ts';

import {
  type Genre,
  type UpdateGenreValidatedData,
  possibleDuplicationError,
} from './utils.ts';

/**********************************************************************************/

async function updateGenre(
  context: RequestContext,
  genreToUpdate: UpdateGenreValidatedData,
): Promise<Genre> {
  const { database } = context;
  const { genreId, ...fieldsToUpdate } = genreToUpdate;

  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  try {
    const [updatedGenre] = await handler
      .update(genreModel)
      .set({ ...fieldsToUpdate, updatedAt: new Date() })
      .where(eq(genreModel.id, genreId))
      .returning({ id: genreModel.id, name: genreModel.name });
    if (!updatedGenre) {
      throw new GeneralError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `Genre '${genreId}' does not exist`,
      );
    }

    return updatedGenre;
  } catch (error) {
    // If there is a conflict it is due to the name field, hence, the name
    // field can be asserted
    throw possibleDuplicationError(error, fieldsToUpdate.name!);
  }
}

/*********************************************************************************/

export { updateGenre };
