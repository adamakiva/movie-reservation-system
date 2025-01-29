import { eq } from 'drizzle-orm';

import {
  GeneralError,
  HTTP_STATUS_CODES,
  type RequestContext,
} from '../../../utils/index.js';

import {
  type Genre,
  type UpdateGenreValidatedData,
  handlePossibleDuplicationError,
} from './utils.js';

/**********************************************************************************/

async function updateGenre(
  context: RequestContext,
  genreToUpdate: UpdateGenreValidatedData,
): Promise<Genre> {
  const { database } = context;
  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();
  const { genreId, ...fieldsToUpdate } = genreToUpdate;

  try {
    const updatedGenre = await handler
      .update(genreModel)
      .set({ ...fieldsToUpdate, updatedAt: new Date() })
      .where(eq(genreModel.id, genreId))
      .returning({ id: genreModel.id, name: genreModel.name });
    if (!updatedGenre.length) {
      throw new GeneralError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `Genre '${genreId}' does not exist`,
      );
    }

    return updatedGenre[0]!;
  } catch (err) {
    // If there is a conflict it is due to the name update, hence, the name
    // field must exist
    throw handlePossibleDuplicationError(err, fieldsToUpdate.name!);
  }
}

/*********************************************************************************/

export { updateGenre };
