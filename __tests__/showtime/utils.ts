import { inArray } from 'drizzle-orm';

import * as serviceFunctions from '../../src/entities/showtime/service/index.js';
import type { Showtime } from '../../src/entities/showtime/service/utils.js';
import * as validationFunctions from '../../src/entities/showtime/validator.js';

import { deleteGenres } from '../genre/utils.js';
import { deleteHalls, seedHalls } from '../hall/utils.js';
import { deleteMovies, seedMovies } from '../movie/utils.js';
import { randomNumber, type ServerParams, VALIDATION } from '../utils.js';

/**********************************************************************************/

type CreateShowtime = {
  at: Date;
};

const { SHOWTIME } = VALIDATION;

/**********************************************************************************/

async function seedShowtime(serverParams: ServerParams) {
  const {
    createdShowtimes,
    createdMovies,
    createdMoviePosters,
    createdHalls,
    createdGenres,
  } = await seedShowtimes(serverParams, 1);

  return {
    createdShowtime: createdShowtimes[0]!,
    createdMovie: createdMovies[0]!,
    createdMoviePosters: createdMoviePosters[0]!,
    createdHall: createdHalls[0]!,
    createdGenres: createdGenres[0]!,
  };
}

async function seedShowtimes(
  serverParams: ServerParams,
  amount: number,
  ratio = amount / 6,
) {
  const { database } = serverParams;
  const handler = database.getHandler();
  const { showtime: showtimeModel } = database.getModels();

  const showtimesToCreate = generateShowtimesData(amount);
  const { createdMovies, createdMoviePosters, createdGenres, ids } =
    await seedMovies(serverParams, Math.ceil(amount / ratio));

  const { createdHalls, hallIds } = await seedHalls(
    serverParams,
    Math.ceil(amount / ratio),
  );

  try {
    const createdShowtimes = await handler
      .insert(showtimeModel)
      .values(
        showtimesToCreate.map((showtimeToCreate) => {
          return {
            ...showtimeToCreate,
            movieId: ids.movie[randomNumber(0, ids.movie.length - 1)]!,
            hallId: hallIds[randomNumber(0, hallIds.length - 1)]!,
          };
        }),
      )
      .returning({
        id: showtimeModel.id,
        at: showtimeModel.at,
        reservations: showtimeModel.reservations,
        movieId: showtimeModel.movieId,
        hallId: showtimeModel.hallId,
      });

    return {
      createdShowtimes,
      createdMovies,
      createdMoviePosters,
      createdHalls,
      createdGenres,
      ids: {
        ...ids,
        hall: hallIds,
        showtime: createdShowtimes.map(({ id }) => {
          return id;
        }),
      },
    };
  } catch (err) {
    // Sequential on purpose to prevent deadlock
    await deleteGenres(serverParams, ...ids.genre);
    await deleteMovies(serverParams, ...ids.movie);
    await deleteHalls(serverParams, ...hallIds);

    throw err;
  }
}

function generateShowtimesData(amount = 1) {
  const showtimes = [...Array(amount)].map(() => {
    return {
      at: new Date(
        randomNumber(
          SHOWTIME.AT.MIN_VALUE.VALUE() + 600_000, // Ten minutes in milliseconds
          SHOWTIME.AT.MIN_VALUE.VALUE() + 2_629_746_000, // One month in milliseconds
        ),
      ),
    } as CreateShowtime;
  });

  return showtimes;
}

async function deleteShowtimes(
  serverParams: ServerParams,
  ...showtimeIds: string[]
) {
  showtimeIds = showtimeIds.filter((showtimeId) => {
    return showtimeId;
  });
  if (!showtimeIds.length) {
    return;
  }

  const databaseHandler = serverParams.database.getHandler();
  const { showtime: showtimeModel } = serverParams.database.getModels();

  await databaseHandler
    .delete(showtimeModel)
    .where(inArray(showtimeModel.id, showtimeIds));
}

/**********************************************************************************/

export {
  deleteShowtimes,
  generateShowtimesData,
  seedShowtime,
  seedShowtimes,
  serviceFunctions,
  validationFunctions,
  type Showtime,
};
