import * as serviceFunctions from '../../src/entities/showtime/service/index.ts';
import type { Showtime } from '../../src/entities/showtime/service/utils.ts';
import * as validationFunctions from '../../src/entities/showtime/validator.ts';

import { seedHalls } from '../hall/utils.ts';
import { seedMovies } from '../movie/utils.ts';
import {
  clearDatabase,
  randomNumber,
  type ServerParams,
  VALIDATION,
} from '../utils.ts';

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
  const { createdMovies, createdMoviePosters, createdGenres } =
    await seedMovies(serverParams, Math.ceil(amount / ratio));

  const createdHalls = await seedHalls(serverParams, Math.ceil(amount / ratio));

  try {
    const createdShowtimes = await handler
      .insert(showtimeModel)
      .values(
        showtimesToCreate.map((showtimeToCreate) => {
          return {
            ...showtimeToCreate,
            movieId:
              createdMovies[randomNumber(0, createdMovies.length - 1)]!.id,
            hallId: createdHalls[randomNumber(0, createdHalls.length - 1)]!.id,
          };
        }),
      )
      .returning({
        id: showtimeModel.id,
        at: showtimeModel.at,
        movieId: showtimeModel.movieId,
        hallId: showtimeModel.hallId,
      });

    return {
      createdShowtimes,
      createdMovies,
      createdMoviePosters,
      createdHalls,
      createdGenres,
    };
  } catch (err) {
    await clearDatabase(serverParams);

    throw err;
  }
}

function generateShowtimesData(amount = 1) {
  const showtimes = [...Array<CreateShowtime>(amount)].map(() => {
    return {
      at: new Date(
        randomNumber(
          SHOWTIME.AT.MIN_VALUE.VALUE() + 600_000, // Ten minutes in milliseconds
          SHOWTIME.AT.MIN_VALUE.VALUE() + 2_629_746_000, // One month in milliseconds
        ),
      ),
    } satisfies CreateShowtime;
  });

  return showtimes;
}

/**********************************************************************************/

export {
  generateShowtimesData,
  seedShowtime,
  seedShowtimes,
  serviceFunctions,
  validationFunctions,
  type Showtime,
};
