import { createReadStream, createWriteStream, type PathLike } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { fileTypeStream } from 'file-type';
import multer, { type Multer, type Options, type StorageEngine } from 'multer';

import { GeneralError } from '../../utils/errors.ts';
import type { Logger } from '../../utils/logger.ts';

/**********************************************************************************/

/**
 * Custom multer storage, see: https://github.com/expressjs/multer/blob/master/StorageEngine.md
 */
class FileManager implements StorageEngine {
  readonly #generatedFileNameLength;
  readonly #saveDir;
  readonly #highWatermark;
  readonly #logger;

  readonly #uploadMiddleware;

  static readonly #ALPHA_NUMERIC = {
    CHARACTERS:
      'ABCDEABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    LENGTH: 67,
  } as const;

  public constructor(params: {
    generatedFileNameLength: number;
    saveDir: string;
    highWatermark: number;
    logger: Logger;
    limits?: Options['limits'];
  }) {
    const { generatedFileNameLength, saveDir, highWatermark, logger, limits } =
      params;

    this.#generatedFileNameLength = generatedFileNameLength;
    this.#saveDir = saveDir;
    this.#highWatermark = highWatermark;
    this.#logger = logger;

    this.#uploadMiddleware = multer({ storage: this, limits });
  }

  public singleFile(...params: Parameters<Multer['single']>) {
    return this.#uploadMiddleware.single(...params);
  }

  public multipleFiles(...params: Parameters<Multer['array']>) {
    return this.#uploadMiddleware.array(...params);
  }

  public async streamFile(dest: Writable, absolutePath: PathLike) {
    try {
      await pipeline(
        // This path is provided by the program, not the end-user
        // eslint-disable-next-line @security/detect-non-literal-fs-filename
        createReadStream(absolutePath, {
          highWaterMark: this.#highWatermark,
        }),
        dest,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        // Means that 'absolutePath' does not exist, which should be impossible
        // considering the programmer set the value
        throw new GeneralError(
          HTTP_STATUS_CODES.SERVER_ERROR,
          'Should never happen, contact an administrator',
          error.cause,
        );
      }

      throw error;
    }
  }

  public deleteFile(absolutePath?: PathLike) {
    if (!absolutePath) {
      return Promise.resolve();
    }

    // This path is provided by the program, not the end-user
    // eslint-disable-next-line @security/detect-non-literal-fs-filename
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
        // This path is provided by the program, not the end-user
        // eslint-disable-next-line @security/detect-non-literal-fs-filename
        const outStream = createWriteStream(file.path, {
          highWaterMark: this.#highWatermark,
        });

        return pipeline(fileStreamWithFileType, outStream)
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
        this.#logger.warn(
          `Failure to delete file: ${file.path}`,
          (error as Error).cause,
        );
        callback(error as Error | null);
      });
  }

  /********************************************************************************/

  #generateFileName() {
    return this.#randomAlphaNumericString(this.#generatedFileNameLength);
  }

  #randomAlphaNumericString(len = 32) {
    let str = '';
    for (let i = 0; i < len; ++i) {
      str += FileManager.#ALPHA_NUMERIC.CHARACTERS.charAt(
        Math.floor(Math.random() * FileManager.#ALPHA_NUMERIC.LENGTH),
      );
    }

    return str;
  }
}

/**********************************************************************************/

export { FileManager };
