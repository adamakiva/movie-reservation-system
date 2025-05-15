import { createReadStream, createWriteStream, type PathLike } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { fileTypeStream } from 'file-type';
import multer, { type Multer, type Options, type StorageEngine } from 'multer';

import {
  GeneralError,
  isSystemCallError,
  registerAbortController,
} from '../../utils/errors.ts';
import type { Logger } from '../../utils/logger.ts';

/**********************************************************************************/

const ALPHA_NUMERIC = {
  CHARACTERS:
    'ABCDEABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  LENGTH: 67,
} as const;

/**********************************************************************************/

class FileManager implements StorageEngine {
  readonly #generatedFileNameLength;
  readonly #saveDir;
  readonly #pipeTimeout;
  readonly #logger;

  readonly #uploadMiddleware;

  public constructor(params: {
    generatedFileNameLength: number;
    saveDir: string;
    highWatermark: number;
    pipeTimeout: number;
    logger: Logger;
    limits?: Options['limits'];
  }) {
    const { generatedFileNameLength, saveDir, pipeTimeout, logger, limits } =
      params;

    this.#generatedFileNameLength = generatedFileNameLength;
    this.#saveDir = saveDir;
    this.#pipeTimeout = pipeTimeout;
    this.#logger = logger;

    this.#uploadMiddleware = multer({ storage: this, limits });
  }

  public singleFile(...params: Parameters<Multer['single']>) {
    return this.#uploadMiddleware.single(...params);
  }

  public streamFile(dest: Writable, absolutePath: PathLike) {
    const { signal, timeoutHandler } = registerAbortController(
      this.#pipeTimeout,
      'Timeout',
    );
    const readStream = createReadStream(absolutePath, { signal });

    return pipeline(readStream, dest, { signal })
      .catch((error: unknown) => {
        if (isSystemCallError(error) && error.code === 'ENOENT') {
          // Means that 'absolutePath' does not exist, which should be impossible
          // considering the programmer set the value
          this.#logger.error(
            `File: '${absolutePath}' does not exist. Should not be possible:`,
            error,
          );
          throw new GeneralError(
            HTTP_STATUS_CODES.SERVER_ERROR,
            'Should never happen, contact an administrator',
            error.cause,
          );
        }

        throw error;
      })
      .finally(() => {
        clearTimeout(timeoutHandler);
      });
  }

  public deleteFile(absolutePath?: PathLike) {
    if (!absolutePath) {
      return Promise.resolve();
    }

    return unlink(absolutePath);
  }

  public _handleFile(...params: Parameters<StorageEngine['_handleFile']>) {
    const [, file, callback] = params;

    fileTypeStream(file.stream)
      .then((fileStreamWithFileType) => {
        if (!fileStreamWithFileType.fileType) {
          throw new GeneralError(
            HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
            `File type is not recognized`,
          );
        }
        const { mime: mimetype, ext: extension } =
          fileStreamWithFileType.fileType;

        const filename = this.#generateFileName();
        file.path = join(this.#saveDir, `${filename}.${extension}`);

        const { signal, timeoutHandler } = registerAbortController(
          this.#pipeTimeout,
          'Timeout',
        );
        const outStream = createWriteStream(file.path, { signal });

        return pipeline(fileStreamWithFileType, outStream, { signal })
          .then(() => {
            callback(null, {
              filename,
              // @ts-expect-error TODO Figure out a nice way to do this (changing
              // mime type key name)
              mimeType: mimetype,
              path: file.path,
              size: outStream.bytesWritten,
            });
          })
          .catch((error: unknown) => {
            throw new GeneralError(
              HTTP_STATUS_CODES.SERVER_ERROR,
              `Failure to stream user file to destination: '${file.path}'`,
              (error as Error).cause,
            );
          })
          .finally(() => {
            clearTimeout(timeoutHandler);
          });
      })
      .catch((error: unknown) => {
        callback(error as Error | null);
      });
  }

  public _removeFile(...params: Parameters<StorageEngine['_removeFile']>) {
    const [, file, callback] = params;

    this.deleteFile(file.path)
      .then(() => {
        callback(null);
      })
      .catch((error: unknown) => {
        this.#logger.error(
          `Failure to delete file: ${file.path}`,
          (error as Error).cause,
        );
        callback(error as Error | null);
      });
  }

  /********************************************************************************/

  #generateFileName() {
    let str = '';
    for (let i = 0; i < this.#generatedFileNameLength; ++i) {
      str += ALPHA_NUMERIC.CHARACTERS.charAt(
        Math.floor(Math.random() * ALPHA_NUMERIC.LENGTH),
      );
    }

    return str;
  }
}

/**********************************************************************************/

export { FileManager };
