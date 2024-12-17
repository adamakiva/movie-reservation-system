import {
  createReadStream,
  createWriteStream,
  findExtension,
  HTTP_STATUS_CODES,
  join,
  MRSError,
  multer,
  pipeline,
  randomBytes,
  unlink,
  type PathLike,
  type RequestContext,
  type Writable,
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
    logger: RequestContext['logger'];
    limits?: multer.Options['limits'];
  }) {
    const { generatedNameLength, saveDir, limits, logger } = params;

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

  public streamFile(dest: Writable, path: PathLike) {
    pipeline(createReadStream(path), dest, (err) => {
      if (!err) {
        return;
      }

      throw new MRSError(
        HTTP_STATUS_CODES.SERVER_ERROR,
        `Failure to stream file: '${path}' to destination`,
        err.cause,
      );
    });
  }

  public deleteFile(...params: Parameters<typeof unlink>) {
    const [path, callback] = params;

    unlink(path, (err) => {
      if (err) {
        this.#logger.warn(`Failure to delete file: ${path}`, err);
      }

      callback(err);
    });
  }

  /********************************************************************************/

  public _handleFile(
    ...params: Parameters<multer.StorageEngine['_handleFile']>
  ) {
    const [, file, callback] = params;

    const extension = findExtension(file.mimetype);
    if (!extension) {
      callback(
        new MRSError(
          HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          `Mime-type '${file.mimetype}' is not recognized`,
        ),
      );
    }
    this.#generateFileName((err, filename) => {
      if (err) {
        callback(err);
        return;
      }

      file.path = join(this.#saveDir, `${filename}.${extension}`);

      const outStream = createWriteStream(file.path);
      pipeline(file.stream, outStream, (err) => {
        if (err) {
          callback(
            new MRSError(
              HTTP_STATUS_CODES.SERVER_ERROR,
              `Failure to stream user file to destination: '${file.path}'`,
              err.cause,
            ),
          );
        }

        callback(null, {
          filename,
          path: file.path,
          size: outStream.bytesWritten,
        });
      });
    });
  }

  public _removeFile(
    ...params: Parameters<multer.StorageEngine['_removeFile']>
  ) {
    const [, file, callback] = params;

    this.deleteFile(file.path, () => {
      callback(null);
    });
  }

  #generateFileName(
    // eslint-disable-next-line no-unused-vars
    callback: (error: Error | null, filename: string) => void,
  ) {
    randomBytes(this.#generatedNameLength, (err, buffer) => {
      callback(err, buffer.toString('hex'));
    });
  }
}

/**********************************************************************************/

export default fileManager;
