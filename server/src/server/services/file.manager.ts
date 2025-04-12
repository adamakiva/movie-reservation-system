import { createReadStream, createWriteStream, type PathLike } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { fileTypeStream } from 'file-type';
import multer from 'multer';

import { GeneralError, type LoggerHandler } from '../../utils/index.ts';

/**********************************************************************************/

class FileManager implements multer.StorageEngine {
  static readonly #ALPHA_NUMERIC_CHARACTERS = {
    CHARACTERS:
      'ABCDEABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    LENGTH: 67,
  } as const;

  readonly #generatedNameLength;
  readonly #saveDir;
  readonly #watermark;
  readonly #logger;
  readonly #upload;

  public constructor(params: {
    generatedNameLength: number;
    saveDir: string;
    watermark: number;
    logger: LoggerHandler;
    limits?: multer.Options['limits'];
  }) {
    const { generatedNameLength, saveDir, watermark, logger, limits } = params;

    this.#generatedNameLength = generatedNameLength;
    this.#saveDir = saveDir;
    this.#watermark = watermark;
    this.#logger = logger;

    this.#upload = multer({ storage: this, limits });
  }

  public single(...params: Parameters<multer.Multer['single']>) {
    return this.#upload.single(...params);
  }

  public multiple(...params: Parameters<multer.Multer['array']>) {
    return this.#upload.array(...params);
  }

  public async streamFile(dest: Writable, absolutePath: PathLike) {
    try {
      // This path is provided by the program, not the end-user
      await pipeline(
        // eslint-disable-next-line @security/detect-non-literal-fs-filename
        createReadStream(absolutePath, {
          highWaterMark: this.#watermark,
        }),
        dest,
      );
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
        // Means that 'absolutePath' does not exist, which should be impossible
        throw new GeneralError(
          HTTP_STATUS_CODES.SERVER_ERROR,
          'Should never happen, contact an administrator',
          err.cause,
        );
      }

      throw err;
    }
  }

  public deleteFile(absolutePath: PathLike) {
    if (!absolutePath) {
      return Promise.resolve();
    }

    // This path is provided by the program, not the end-user
    // eslint-disable-next-line @security/detect-non-literal-fs-filename
    return unlink(absolutePath);
  }

  /********************************************************************************/

  public _handleFile(
    ...params: Parameters<multer.StorageEngine['_handleFile']>
  ) {
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
          highWaterMark: this.#watermark,
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
          .catch((err: unknown) => {
            throw new GeneralError(
              HTTP_STATUS_CODES.SERVER_ERROR,
              `Failure to stream user file to destination: '${file.path}'`,
              (err as Error).cause,
            );
          });
      })
      .catch((err: unknown) => {
        callback(err as Error | null);
      });
  }

  public _removeFile(
    ...params: Parameters<multer.StorageEngine['_removeFile']>
  ) {
    const [, file, callback] = params;

    this.deleteFile(file.path)
      .then(() => {
        callback(null);
      })
      .catch((err: unknown) => {
        this.#logger.warn(
          `Failure to delete file: ${file.path}`,
          (err as Error).cause,
        );
        callback(err as Error | null);
      });
  }

  #generateFileName() {
    return this.#randomAlphaNumericString(this.#generatedNameLength);
  }

  #randomAlphaNumericString(len = 32) {
    let str = '';
    for (let i = 0; i < len; ++i) {
      str += FileManager.#ALPHA_NUMERIC_CHARACTERS.CHARACTERS.charAt(
        Math.floor(
          Math.random() * FileManager.#ALPHA_NUMERIC_CHARACTERS.LENGTH,
        ),
      );
    }

    return str;
  }
}

/**********************************************************************************/

export default FileManager;
