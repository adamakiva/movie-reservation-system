import { createReadStream, createWriteStream, type PathLike } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { fileTypeStream } from 'file-type';
import multer from 'multer';

import {
  HTTP_STATUS_CODES,
  MRSError,
  randomAlphaNumericString,
  type LoggerHandler,
} from '../../utils/index.js';

/**********************************************************************************/

class fileManager implements multer.StorageEngine {
  readonly #generatedNameLength;
  readonly #saveDir;
  readonly #logger;
  readonly #upload;

  public constructor(params: {
    generatedNameLength: number;
    saveDir: string;
    logger: LoggerHandler;
    limits?: multer.Options['limits'];
  }) {
    const { generatedNameLength, saveDir, logger, limits } = params;

    this.#generatedNameLength = generatedNameLength;
    this.#saveDir = saveDir;
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
    // This path is provided by the program, not the end-user
    // eslint-disable-next-line @security/detect-non-literal-fs-filename
    await pipeline(createReadStream(absolutePath), dest);
  }

  public async deleteFile(absolutePath: PathLike) {
    // This path is provided by the program, not the end-user
    // eslint-disable-next-line @security/detect-non-literal-fs-filename
    await unlink(absolutePath);
  }

  /********************************************************************************/

  public _handleFile(
    ...params: Parameters<multer.StorageEngine['_handleFile']>
  ) {
    const [, file, callback] = params;

    fileTypeStream(file.stream)
      .then((fileStreamWithFileType) => {
        if (!fileStreamWithFileType.fileType) {
          throw new MRSError(
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
        const outStream = createWriteStream(file.path);

        return pipeline(fileStreamWithFileType, outStream)
          .then(() => {
            callback(null, {
              filename,
              // @ts-expect-error Figure out a nice way to do this
              mimeType: mimetype,
              path: file.path,
              size: outStream.bytesWritten,
            });
          })
          .catch((err: unknown) => {
            throw new MRSError(
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
        this.#logger.warn(`Failure to delete file: ${file.path}`, err);
        callback(err as Error | null);
      });
  }

  #generateFileName() {
    const randomString = randomAlphaNumericString(this.#generatedNameLength);

    return randomString;
  }
}

/**********************************************************************************/

export default fileManager;
