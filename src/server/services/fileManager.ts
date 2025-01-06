import {
  createReadStream,
  createWriteStream,
  fileType,
  HTTP_STATUS_CODES,
  join,
  MRSError,
  multer,
  pipeline,
  randomBytes,
  unlink,
  type LoggerHandler,
  type PathLike,
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
    await pipeline(createReadStream(absolutePath), dest);
  }

  public async deleteFile(absolutePath: PathLike) {
    await unlink(absolutePath);
  }

  /********************************************************************************/

  public _handleFile(
    ...params: Parameters<multer.StorageEngine['_handleFile']>
  ) {
    const [, file, callback] = params;

    fileType
      .fileTypeStream(file.stream)
      .then((fileStreamWithFileType) => {
        if (!fileStreamWithFileType.fileType) {
          throw new MRSError(
            HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
            `File type is not recognized`,
          );
        }
        const { mime: mimetype, ext: extension } =
          fileStreamWithFileType.fileType;

        return this.#generateFileName().then((filename) => {
          file.path = join(this.#saveDir, `${filename}.${extension}`);
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

  async #generateFileName() {
    const randomString = (
      await randomBytes(this.#generatedNameLength)
    ).toString('hex');

    return randomString;
  }
}

/**********************************************************************************/

export default fileManager;
