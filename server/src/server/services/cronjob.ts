import type { PathLike } from 'node:fs';
import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { CronJob } from 'cron';
import { notInArray } from 'drizzle-orm';

import type { Database } from '../../database/handler.ts';
import { isSystemCallError } from '../../utils/errors.ts';
import type { Logger } from '../../utils/logger.ts';

/**********************************************************************************/

class Cronjob {
  readonly #moviePosterCleanupParams;
  readonly #abortController;
  readonly #cronjobs: CronJob<null, this>[] = [];

  readonly #database;
  readonly #logger;

  public constructor(params: {
    moviePosterCleanupParams: {
      directory: string;
      retryInterval: number;
      retryLimit: number;
    };
    database: Database;
    logger: Logger;
  }) {
    const { moviePosterCleanupParams, database, logger } = params;

    this.#moviePosterCleanupParams = moviePosterCleanupParams;
    this.#abortController = new AbortController();

    this.#database = database;
    this.#logger = logger;

    this.#cronjobs.push(
      CronJob.from({
        cronTime: '00 00 00 * * *',
        name: 'Movie posters cleanup',
        context: this,
        errorHandler: function (error) {
          logger.error('Cronjob failure:', error);
        },
        onTick: this.#moviePosterCleanup,
        runOnInit: true,
      }),
    );
  }

  public async stopAll() {
    this.#abortController.abort('Shutdown');

    await Promise.allSettled(
      this.#cronjobs.map(async (cronjob) => {
        await cronjob.stop();
      }),
    );
  }

  /********************************************************************************/

  async #moviePosterCleanup() {
    const { directory, retryInterval, retryLimit } =
      this.#moviePosterCleanupParams;

    // Value is specified by the program, not the end user
    // eslint-disable-next-line @security/detect-non-literal-fs-filename
    const posterPaths = (await readdir(directory, { withFileTypes: true }))
      .filter((element) => {
        return !element.isDirectory();
      })
      .map((element) => {
        return join(directory, element.name);
      });

    const handler = this.#database.getHandler();
    const { moviePoster: moviePosterModel } = this.#database.getModels();

    const postersNotInUse = await handler
      .select({ path: moviePosterModel.absolutePath })
      .from(moviePosterModel)
      .where(notInArray(moviePosterModel.absolutePath, posterPaths));

    const results = await Promise.allSettled(
      postersNotInUse.map(async ({ path }) => {
        await this.#removeFile({
          path,
          retryInterval,
          retryAttempt: 0,
          retryLimit,
        });
      }),
    );
    // Errors will be retired again on the next cleanup
    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.#logger.error('Failure to remove file:', result.reason);
      }
    });
  }

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
      // Value is specified by the program, not the end user
      // eslint-disable-next-line @security/detect-non-literal-fs-filename
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
