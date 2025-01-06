import {
  type DatabaseHandler,
  eq,
  HTTP_STATUS_CODES,
  MRSError,
  type RequestContext,
} from '../../../utils/index.js';

import {
  type CreateShowtimeValidatedData,
  handlePossibleDuplicationError,
  type Showtime,
} from './utils.js';

/**********************************************************************************/

async function createShowtime(
  context: RequestContext,
  showtimeToCreate: CreateShowtimeValidatedData,
): Promise<Showtime> {
  const createdShowtime = await insertShowtimeToDatabase(
    context.database,
    showtimeToCreate,
  );

  return createdShowtime;
}

/**********************************************************************************/

async function insertShowtimeToDatabase(
  database: RequestContext['database'],
  showtimeToCreate: CreateShowtimeValidatedData,
) {
  const handler = database.getHandler();
  const {
    showtime: showtimeModel,
    movie: movieModel,
    hall: hallModel,
  } = database.getModels();

  const [movieTitle, hallName] = await Promise.all([
    getMovieTitle({
      handler,
      model: movieModel,
      movieId: showtimeToCreate.movieId,
    }),
    getHallName({
      handler,
      model: hallModel,
      hallId: showtimeToCreate.hallId,
    }),
  ]);

  try {
    const createdShowtime = (
      await handler.insert(showtimeModel).values(showtimeToCreate).returning({
        id: showtimeModel.id,
        at: showtimeModel.at,
        reservations: showtimeModel.reservations,
      })
    )[0]!;

    return { ...createdShowtime, movieTitle, hallName };
  } catch (err) {
    throw handlePossibleDuplicationError({
      err,
      showtime: showtimeToCreate.at,
      hall: hallName,
    });
  }
}

/**********************************************************************************/

async function getMovieTitle(params: {
  handler: DatabaseHandler;
  model: ReturnType<RequestContext['database']['getModels']>['movie'];
  movieId: string;
}) {
  const { handler, model, movieId } = params;

  const movies = await handler
    .select({ title: model.title })
    .from(model)
    .where(eq(model.id, movieId));
  if (!movies.length) {
    throw new MRSError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Movie ${movieId} does not exist`,
    );
  }

  return movies[0]!.title;
}

async function getHallName(params: {
  handler: DatabaseHandler;
  model: ReturnType<RequestContext['database']['getModels']>['hall'];
  hallId: string;
}) {
  const { handler, model, hallId } = params;

  const halls = await handler
    .select({ name: model.name })
    .from(model)
    .where(eq(model.id, hallId));
  if (!halls.length) {
    throw new MRSError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Hall ${hallId} does not exist`,
    );
  }

  return halls[0]!.name;
}

/**********************************************************************************/

export { createShowtime };
