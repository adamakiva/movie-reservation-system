import {
  createWriteStream,
  findExtension,
  HTTP_STATUS_CODES,
  join,
  MRSError,
  multer,
  pipeline,
  randomBytes,
  unlink,
  type RequestContext,
} from '../../utils/index.js';

/**********************************************************************************/

class FileParser implements multer.StorageEngine {
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

  public _handleFile(
    ...params: Parameters<multer.StorageEngine['_handleFile']>
  ) {
    const [, file, callback] = params;

    this.#generateFileName((err, filename) => {
      if (err) {
        callback(err);
        return;
      }

      const extension = findExtension(file.mimetype);
      if (!extension) {
        callback(
          new MRSError(
            HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
            `Mime-type '${file.mimetype}' is not recognized`,
          ),
        );
      }
      file.path = join(this.#saveDir, filename);

      const outStream = createWriteStream(file.path);
      pipeline(file.stream, outStream, (err) => {
        callback(err, {
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

    unlink(file.path)
      .catch((err: unknown) => {
        this.#logger.warn(`Failure to remove file: ${file.path}`, err);
      })
      .finally(() => {
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

export default FileParser;
