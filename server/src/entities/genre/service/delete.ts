import { eq } from 'drizzle-orm';
import type { Locals } from 'express';

import {
  type DeleteGenreValidatedData,
  possibleForeignKeyError,
} from './utils.ts';

/**********************************************************************************/

async function deleteGenre(
  context: Locals,
  genreId: DeleteGenreValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  try {
    await handler.delete(genreModel).where(eq(genreModel.id, genreId));
  } catch (error) {
    throw possibleForeignKeyError(error, genreId);
  }
}

/*********************************************************************************/

export { deleteGenre };
