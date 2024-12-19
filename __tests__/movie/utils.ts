import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { inArray } from 'drizzle-orm';

import type { Movie } from '../../src/entities/movie/service/utils.js';
import { fileType } from '../../src/utils/index.js';

import { deleteGenres, generateGenresData, seedGenre } from '../genre/utils.js';
import {
  randomNumber,
  randomString,
  randomUUID,
  type ServerParams,
} from '../utils.js';

/**********************************************************************************/

type CreateMovie = {
  title: string;
  description: string;
  price: number;
  poster: CreateMoviePoster;
  genreId: string;
};
type CreateMoviePoster = {
  path: string;
  mimeType: string;
  size: number;
};

/**********************************************************************************/

async function seedMovie(serverParams: ServerParams) {
  const { createdMovies, createdGenres, createdMoviePosters } =
    await seedMovies(serverParams, 1);

  return {
    createdMovie: createdMovies[0]!,
    createdGenre: createdGenres[0]!,
    createdMoviePosters,
  };
}

async function seedMovies(serverParams: ServerParams, amount: number) {
  const { database } = serverParams;
  const handler = database.getHandler();
  const {
    movie: movieModel,
    moviePoster: moviePosterModel,
    genre: genreModel,
  } = database.getModels();

  const moviesToCreate = generateMoviesData(amount);
  // Pay attention that this only generate a single role for a single user for
  // a proper cleanup of the 'seedUser' function
  const genresToCreate = generateGenresData(Math.ceil(amount / 3));
  const moviePostersToCreate = await generateMoviePostersData();

  const createdEntities = await handler.transaction(async (transaction) => {
    const createdGenres = await transaction
      .insert(genreModel)
      .values(genresToCreate)
      .returning({ id: genreModel.id, name: genreModel.name });
    const createdMovies = await transaction
      .insert(movieModel)
      .values(
        moviesToCreate.map((movieToCreate) => {
          return {
            ...movieToCreate,
            genreId:
              createdGenres[randomNumber(0, createdGenres.length - 1)]!.id,
          };
        }),
      )
      .returning({
        id: movieModel.id,
        title: movieModel.title,
        description: movieModel.description,
        price: movieModel.price,
        genreId: movieModel.genreId,
      });
    const createdMoviePosters = await Promise.all(
      createdMovies.map(async (createdMovie) => {
        return (
          await transaction
            .insert(moviePosterModel)
            .values({
              ...moviePostersToCreate[
                randomNumber(0, moviePostersToCreate.length - 1)
              ]!,
              movieId: createdMovie.id,
            })
            .returning({
              path: moviePosterModel.path,
              mimeType: moviePosterModel.mimeType,
              size: moviePosterModel.size,
            })
        )[0]!;
      }),
    );

    return {
      createdGenres,
      createdMovies,
      createdMoviePosters,
    };
  });

  const createdMovies = createdEntities.createdMovies.map((createdMovie) => {
    const { genreId, ...fields } = createdMovie;
    const genreName = createdEntities.createdGenres.find((genre) => {
      return genre.id === genreId;
    })!.name;

    return {
      ...fields,
      genre: genreName,
    };
  });

  return {
    createdGenres: createdEntities.createdGenres,
    createdMovies,
    createdMoviePosters: createdEntities.createdMoviePosters,
  };
}

function generateMoviesData(amount = 1) {
  const movies = [...Array(amount)].map(() => {
    return {
      title: randomString(16),
      description: randomString(256),
      price: randomNumber(0, 99) + 1,
    } as CreateMovie;
  });

  return movies;
}

async function generateRandomMovieData(genreId?: string) {
  // eslint-disable-next-line @security/detect-non-literal-fs-filename
  const imageNames = await readdir(join(import.meta.dirname, 'images'));
  const moviePosters = await Promise.all(
    imageNames.map(async (imageName) => {
      const path = join(import.meta.dirname, 'images', imageName);
      // eslint-disable-next-line @security/detect-non-literal-fs-filename
      const { size } = await stat(path);

      return {
        path,
        mimeType: (await fileType.fileTypeFromFile(path))!.mime,
        size,
      };
    }),
  );

  return {
    ...generateMoviesData(1)[0]!,
    poster: moviePosters[randomNumber(0, moviePosters.length - 1)]!,
    genreId: genreId ?? randomUUID(),
  };
}

async function generateMoviePostersData() {
  // eslint-disable-next-line @security/detect-non-literal-fs-filename
  const imageNames = await readdir(join(import.meta.dirname, 'images'));
  const moviePosters = await Promise.all(
    imageNames.map(async (imageName) => {
      const path = join(import.meta.dirname, 'images', imageName);
      // eslint-disable-next-line @security/detect-non-literal-fs-filename
      const { size } = await stat(path);

      return {
        path,
        mimeType: (await fileType.fileTypeFromFile(path))!.mime,
        size,
      };
    }),
  );

  return moviePosters;
}

async function deleteMovies(serverParams: ServerParams, ...movieIds: string[]) {
  movieIds = movieIds.filter((movieId) => {
    return movieId;
  });
  if (!movieIds.length) {
    return;
  }

  const databaseHandler = serverParams.database.getHandler();
  const { movie: movieModel, moviePoster: moviePosterModel } =
    serverParams.database.getModels();

  // Note: The actual files are written to 'os.tmpdir()' from the tests so there's
  // no need to remove them manually
  await databaseHandler
    .delete(moviePosterModel)
    .where(inArray(moviePosterModel.movieId, movieIds));
  await databaseHandler
    .delete(movieModel)
    .where(inArray(movieModel.id, movieIds));
}

/**********************************************************************************/

export {
  deleteGenres,
  deleteMovies,
  generateMoviesData,
  generateRandomMovieData,
  readFile,
  seedGenre,
  seedMovie,
  seedMovies,
  type CreateMovie,
  type Movie,
};
