import {
  asc,
  eq,
  ERROR_CODES,
  HTTP_STATUS_CODES,
  MRSError,
  pg,
  type RequestContext,
} from '../../../utils/index.js';

import type {
  validateCreateGenre,
  validateDeleteGenre,
  validateUpdateGenre,
} from '../validator.js';

/**********************************************************************************/

type CreateGenreValidatedData = ReturnType<typeof validateCreateGenre>;
type UpdateGenreValidatedData = ReturnType<typeof validateUpdateGenre>;
type DeleteGenreValidatedData = ReturnType<typeof validateDeleteGenre>;

type Genre = {
  id: string;
  name: string;
};

/**********************************************************************************/

async function readGenresFromDatabase(database: RequestContext['database']) {
  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  const genres = await handler
    .select({ id: genreModel.id, name: genreModel.name })
    .from(genreModel)
    .orderBy(asc(genreModel.name));

  return genres;
}

async function insertGenreToDatabase(
  database: RequestContext['database'],
  genreToCreate: CreateGenreValidatedData,
) {
  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  try {
    const createdGenre = (
      await handler
        .insert(genreModel)
        .values(genreToCreate)
        .returning({ id: genreModel.id, name: genreModel.name })
    )[0]!;

    return createdGenre;
  } catch (err) {
    throw handlePossibleDuplicationError(err, genreToCreate.name);
  }
}

async function updateGenreInDatabase(
  database: RequestContext['database'],
  genreToUpdate: UpdateGenreValidatedData,
) {
  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();
  const { genreId, ...fieldsToUpdate } = genreToUpdate;

  try {
    const updatedGenre = await handler
      .update(genreModel)
      .set(fieldsToUpdate)
      .where(eq(genreModel.id, genreId))
      .returning({ id: genreModel.id, name: genreModel.name });
    if (!updatedGenre.length) {
      throw new MRSError(
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

async function deleteGenreFromDatabase(
  database: RequestContext['database'],
  genreId: DeleteGenreValidatedData,
) {
  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  await handler.delete(genreModel).where(eq(genreModel.id, genreId));
}

function handlePossibleDuplicationError(err: unknown, conflictField: string) {
  if (
    err instanceof pg.PostgresError &&
    err.code === ERROR_CODES.POSTGRES.UNIQUE_VIOLATION
  ) {
    return new MRSError(
      HTTP_STATUS_CODES.CONFLICT,
      `Genre '${conflictField}' already exists`,
      err.cause,
    );
  }

  return err;
}

/**********************************************************************************/

export {
  deleteGenreFromDatabase,
  insertGenreToDatabase,
  readGenresFromDatabase,
  updateGenreInDatabase,
  type CreateGenreValidatedData,
  type DeleteGenreValidatedData,
  type Genre,
  type UpdateGenreValidatedData,
};
