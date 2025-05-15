import Stream from 'node:stream';

/**********************************************************************************/

const EXPECTED_ENVIRONMENT_VARIABLES = [
  'NODE_DEFAULT_HIGH_WATERMARK',
  'MESSAGE_QUEUE_URL',
  'MESSAGE_QUEUE_CONSUMER_CONCURRENCY',
  'MESSAGE_QUEUE_CONSUMER_PREFETCH_COUNT',
] as const;

/**********************************************************************************/
class EnvironmentManager {
  readonly #environmentVariables;

  public constructor() {
    this.#checkForMissingEnvironmentVariables();

    this.#environmentVariables = {
      messageQueueUrl: process.env.MESSAGE_QUEUE_URL!,
      consumer: {
        concurrency: this.#toNumber(
          'MESSAGE_QUEUE_CONSUMER_CONCURRENCY',
          process.env.MESSAGE_QUEUE_CONSUMER_CONCURRENCY,
        )!,
        prefetchCount: this.#toNumber(
          'MESSAGE_QUEUE_CONSUMER_PREFETCH_COUNT',
          process.env.MESSAGE_QUEUE_CONSUMER_PREFETCH_COUNT,
        )!,
      },
    } as const;

    this.#setGlobalValues();
  }

  public getEnvVariables() {
    return this.#environmentVariables;
  }

  /********************************************************************************/

  #checkForMissingEnvironmentVariables() {
    const errorMessages: string[] = [];
    EXPECTED_ENVIRONMENT_VARIABLES.forEach((key) => {
      if (!process.env[key]) {
        errorMessages.push(`* Missing ${key} environment variable`);
      }
    });
    if (errorMessages.length) {
      console.error(errorMessages.join('\n'));

      process.exit(1);
    }
  }

  #toNumber(key: string, value: string | undefined) {
    if (!value) {
      return undefined;
    }

    const valueAsNumber = Number(value);

    if (isNaN(valueAsNumber)) {
      console.error(`Invalid value for '${key}' environment variable`);

      process.exit(1);
    }

    return valueAsNumber;
  }

  #setGlobalValues() {
    const defaultHighWaterMark = this.#toNumber(
      'NODE_DEFAULT_HIGH_WATERMARK',
      process.env.NODE_DEFAULT_HIGH_WATERMARK,
    )!;

    // See: https://nodejs.org/api/events.html#capture-rejections-of-promises
    Stream.EventEmitter.captureRejections = true;

    // Set the default high water mark for Readable/Writeable streams
    Stream.setDefaultHighWaterMark(false, defaultHighWaterMark);
  }
}

/**********************************************************************************/

export { EnvironmentManager };
