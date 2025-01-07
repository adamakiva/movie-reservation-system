import assert from 'node:assert/strict';
import type { PathLike } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { inArray } from 'drizzle-orm';

import * as serviceFunctions from '../../src/entities/movie/service/index.js';
import type { Movie } from '../../src/entities/movie/service/utils.js';
import * as validationFunctions from '../../src/entities/movie/validator.js';
import { fileType } from '../../src/utils/index.js';

import { deleteGenres, seedGenre, seedGenres } from '../genre/utils.js';
import {
  randomNumber,
  randomString,
  randomUUID,
  type ServerParams,
  VALIDATION,
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
  absolutePath: string;
  mimeType: string;
  sizeInBytes: number;
};

const { MOVIE } = VALIDATION;

/**********************************************************************************/

async function seedMovie(serverParams: ServerParams) {
  const { createdMovies, createdGenres, createdMoviePosters, ids } =
    await seedMovies(serverParams, 1);

  return {
    createdMovie: createdMovies[0]!,
    createdGenre: createdGenres[0]!,
    createdMoviePoster: createdMoviePosters[0]!,
    ids,
  };
}

async function seedMovies(
  serverParams: ServerParams,
  amount: number,
  ratio = amount / 6,
) {
  const { database } = serverParams;
  const handler = database.getHandler();
  const { movie: movieModel, moviePoster: moviePosterModel } =
    database.getModels();

  const moviesToCreate = generateMoviesData(amount);
  // Pay attention that this only generate a single role for a single user for
  // a proper cleanup of the 'seedUser' function
  const { createdGenres, genreIds } = await seedGenres(
    serverParams,
    Math.ceil(amount / ratio),
  );

  try {
    const moviePostersToCreate = await generateMoviePostersData();

    const createdEntities = await handler.transaction(async (transaction) => {
      const createdMovies = await transaction
        .insert(movieModel)
        .values(
          moviesToCreate.map((movieToCreate) => {
            return {
              ...movieToCreate,
              genreId: genreIds[randomNumber(0, genreIds.length - 1)]!,
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
                absolutePath: moviePosterModel.absolutePath,
                mimeType: moviePosterModel.mimeType,
                sizeInBytes: moviePosterModel.sizeInBytes,
              })
          )[0]!;
        }),
      );

      return {
        createdMovies,
        createdMoviePosters,
      };
    });

    const createdMovies = createdEntities.createdMovies.map((createdMovie) => {
      const { genreId, ...fields } = createdMovie;
      const genreName = createdGenres.find((genre) => {
        return genre.id === genreId;
      })!.name;

      return {
        ...fields,
        genre: genreName,
      };
    });

    return {
      createdGenres: createdGenres,
      createdMovies,
      createdMoviePosters: createdEntities.createdMoviePosters,
      ids: {
        genre: genreIds,
        movie: createdMovies.map(({ id }) => {
          return id;
        }),
      },
    };
  } catch (err) {
    await deleteGenres(serverParams, ...genreIds);

    throw err;
  }
}

function generateMoviesData(amount = 1) {
  const movies = [...Array(amount)].map(() => {
    return {
      title: randomString(MOVIE.TITLE.MIN_LENGTH.VALUE + 1),
      description: randomString(MOVIE.DESCRIPTION.MIN_LENGTH.VALUE + 1),
      price: randomNumber(
        MOVIE.PRICE.MIN_VALUE.VALUE + 1,
        MOVIE.PRICE.MAX_VALUE.VALUE - 1,
      ),
    } as CreateMovie;
  });

  return movies;
}

async function generateMovieDataIncludingPoster(genreId?: string) {
  // eslint-disable-next-line @security/detect-non-literal-fs-filename
  const imageNames = await readdir(join(import.meta.dirname, 'images'));
  const moviePosters = await Promise.all(
    imageNames.map(async (imageName) => {
      const absolutePath = join(import.meta.dirname, 'images', imageName);
      // eslint-disable-next-line @security/detect-non-literal-fs-filename
      const { size: sizeInBytes } = await stat(absolutePath);

      return {
        path: absolutePath,
        mimeType: (await fileType.fileTypeFromFile(absolutePath))!.mime,
        size: sizeInBytes,
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
      const absolutePath = join(import.meta.dirname, 'images', imageName);
      // eslint-disable-next-line @security/detect-non-literal-fs-filename
      const { size } = await stat(absolutePath);

      return {
        absolutePath,
        mimeType: (await fileType.fileTypeFromFile(absolutePath))!.mime,
        sizeInBytes: size,
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

async function compareFiles(dest: Response, src: PathLike) {
  const [responseBody, expectedFile] = await Promise.all([
    dest.bytes(),
    // eslint-disable-next-line @security/detect-non-literal-fs-filename
    readFile(src),
  ]);

  assert.strictEqual(expectedFile.compare(responseBody) === 0, true);
}

/**********************************************************************************/

export {
  compareFiles,
  deleteMovies,
  generateMovieDataIncludingPoster,
  generateMoviePostersData,
  generateMoviesData,
  readFile,
  seedGenre,
  seedMovie,
  seedMovies,
  serviceFunctions,
  validationFunctions,
  type Movie,
};
