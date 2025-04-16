import assert from 'node:assert/strict';
import type { PathLike } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { fileTypeFromFile } from 'file-type';

import * as serviceFunctions from '../../src/entities/movie/service/index.ts';
import type { Movie } from '../../src/entities/movie/service/utils.ts';
import * as validationFunctions from '../../src/entities/movie/validator.ts';
import { MOVIE } from '../../src/entities/movie/validator.ts';

import { seedGenre, seedGenres } from '../genre/utils.ts';
import { USER } from '../user/utils.ts';
import {
  clearDatabase,
  randomAlphaNumericString,
  randomNumber,
  randomUUID,
  type ServerParams,
} from '../utils.ts';

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

/**********************************************************************************/

async function seedMovie(serverParams: ServerParams) {
  const { createdMovies, createdGenres, createdMoviePosters } =
    await seedMovies(serverParams, 1);

  return {
    createdMovie: createdMovies[0]!,
    createdGenre: createdGenres[0]!,
    createdMoviePoster: createdMoviePosters[0]!,
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
  const createdGenres = await seedGenres(
    serverParams,
    Math.ceil(amount / ratio),
  );
  const now = new Date();
  try {
    const createdEntities = await handler.transaction(async (transaction) => {
      const createdMovies = await transaction
        .insert(movieModel)
        .values(
          moviesToCreate.map((movieToCreate) => {
            return {
              ...movieToCreate,
              genreId:
                createdGenres[randomNumber(0, createdGenres.length - 1)]!.id,
              createdAt: now,
              updatedAt: now,
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

      const moviePostersData = await generateMoviePostersData();
      const createdMoviePosters = await transaction
        .insert(moviePosterModel)
        .values(
          createdMovies.map(({ id: movieId }) => {
            return {
              movieId,
              ...moviePostersData[moviePostersData.length - 1]!,
              createdAt: now,
              updatedAt: now,
            };
          }),
        )
        .returning({
          absolutePath: moviePosterModel.absolutePath,
          mimeType: moviePosterModel.mimeType,
          sizeInBytes: moviePosterModel.sizeInBytes,
        });

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
      createdGenres,
      createdMovies,
      createdMoviePosters: createdEntities.createdMoviePosters,
    };
  } catch (error) {
    await clearDatabase(serverParams.database);

    throw error;
  }
}

function generateMoviesData(amount = 1) {
  const movies = [
    ...Array<Omit<CreateMovie, 'poster' | 'genreId'>>(amount),
  ].map(() => {
    return {
      title: randomAlphaNumericString(MOVIE.TITLE.MIN_LENGTH.VALUE + 1),
      description: randomAlphaNumericString(
        MOVIE.DESCRIPTION.MIN_LENGTH.VALUE + 1,
      ),
      price: randomNumber(
        MOVIE.PRICE.MIN_VALUE.VALUE + 1,
        MOVIE.PRICE.MAX_VALUE.VALUE - 1,
      ),
    } satisfies Omit<CreateMovie, 'poster' | 'genreId'>;
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
        mimeType: (await fileTypeFromFile(absolutePath))!.mime,
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
        mimeType: (await fileTypeFromFile(absolutePath))!.mime,
        sizeInBytes: size,
      };
    }),
  );

  return moviePosters;
}

async function compareFiles(dest: Uint8Array, src: PathLike) {
  // eslint-disable-next-line @security/detect-non-literal-fs-filename
  const expectedFile = await readFile(src);

  assert.strictEqual(expectedFile.compare(dest) === 0, true);
}

/**********************************************************************************/

export {
  compareFiles,
  generateMovieDataIncludingPoster,
  generateMoviePostersData,
  generateMoviesData,
  MOVIE,
  readFile,
  seedGenre,
  seedMovie,
  seedMovies,
  serviceFunctions,
  USER,
  validationFunctions,
  type Movie,
};
