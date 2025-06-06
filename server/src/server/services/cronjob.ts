import type { PathLike } from 'node:fs';
import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { CronJob } from 'cron';
import { notInArray } from 'drizzle-orm';

import type { Database } from '../../database/index.ts';
import { isSystemCallError } from '../../utils/errors.ts';
import type { Logger } from '../../utils/logger.ts';

/**********************************************************************************/

class Cronjob {
  readonly #abortController;
  readonly #moviePosterCleanupJob;

  public constructor(params: {
    moviePosterCleanupParams: {
      directory: string;
      retryInterval: number;
      retryLimit: number;
    };
    database: Database;
    logger: Logger;
  }) {
    const {
      moviePosterCleanupParams: { directory, retryInterval, retryLimit },
      database,
      logger,
    } = params;

    this.#abortController = new AbortController();

    this.#moviePosterCleanupJob = CronJob.from({
      cronTime: '00 00 00 * * *',
      name: 'Movie posters cleanup',
      errorHandler: (error) => {
        logger.error('Cronjob failure:', error);
      },
      onTick: async () => {
        const posterPaths = (await readdir(directory, { withFileTypes: true }))
          .filter((element) => {
            return !element.isDirectory();
          })
          .map((element) => {
            return join(directory, element.name);
          });

        const handler = database.getHandler();
        const { moviePoster: moviePosterModel } = database.getModels();

        const unusedMoviePosters = await handler
          .select({ path: moviePosterModel.absolutePath })
          .from(moviePosterModel)
          .where(notInArray(moviePosterModel.absolutePath, posterPaths));

        const results = await Promise.allSettled(
          unusedMoviePosters.map(async ({ path }) => {
            await this.#removeFile({
              path,
              retryInterval,
              retryAttempt: 0,
              retryLimit,
            });
          }),
        );
        // Failed promises will be retired again on the next cleanup
        results.forEach((result) => {
          if (result.status === 'rejected') {
            logger.error('Failure to remove file:', result.reason);
          }
        });
      },
      runOnInit: true,
    });
  }

  public async stopAll() {
    this.#abortController.abort('Shutdown');

    await this.#moviePosterCleanupJob.stop();
  }

  /********************************************************************************/

  async #removeFile(params: {
    path: PathLike;
    retryInterval: number;
    retryAttempt: number;
    retryLimit: number;
  }) {
    const { path, retryInterval, retryAttempt, retryLimit } = params;

    await setTimeout(retryInterval, undefined, {
      signal: this.#abortController.signal,
    });

    try {
      await unlink(path);
    } catch (error) {
      if (
        retryAttempt > retryLimit ||
        (isSystemCallError(error) && error.code === 'ENOENT')
      ) {
        throw error;
      }

      await this.#removeFile({
        path,
        retryInterval: retryInterval * 1.5,
        retryAttempt: retryAttempt + 1,
        retryLimit,
      });
    }
  }
}

/**********************************************************************************/

export { Cronjob };
