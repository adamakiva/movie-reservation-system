import { ERROR_CODES } from './constants.js';
import type { LoggerHandler } from './logger.js';

/**********************************************************************************/

type EnvironmentVariables = {
  server: {
    port: number;
    baseUrl: string;
    httpRoute: string;
    allowedHosts: Set<string>;
    allowedOrigins: Set<string>;
    allowedMethods: Set<string>;
  };
  databaseUrl: string;
  hashSecret: Buffer;
};

/**********************************************************************************/

class EnvironmentManager {
  readonly #logger;
  readonly #environmentVariables;

  public constructor(logger: LoggerHandler) {
    this.#logger = logger;
    this.#checkForMissingEnvironmentVariables();

    this.#environmentVariables = {
      server: {
        port: parseInt(process.env.SERVER_PORT!),
        baseUrl: process.env.SERVER_BASE_URL!,
        httpRoute: process.env.HTTP_ROUTE!,
        allowedHosts: new Set(process.env.ALLOWED_HOSTS!.split(',')),
        allowedOrigins: new Set(process.env.ALLOWED_ORIGINS!.split(',')),
        allowedMethods: new Set([
          'HEAD',
          'GET',
          'POST',
          'PUT',
          'PATCH',
          'DELETE',
          'OPTIONS',
        ]),
      },
      databaseUrl: process.env.DATABASE_URL!,
      hashSecret: Buffer.from(process.env.HASH_SECRET!),
    } as const satisfies EnvironmentVariables;
  }

  public getEnvVariables() {
    return this.#environmentVariables;
  }

  /********************************************************************************/

  #checkForMissingEnvironmentVariables() {
    const errorMessages: string[] = [];
    this.#mapEnvironmentVariables().forEach((key) => {
      if (!process.env[key]) {
        errorMessages.push(`* Missing ${key} environment variable`);
      }
    });
    if (errorMessages.length) {
      this.#logger.fatal(errorMessages.join('\n'));

      process.exit(ERROR_CODES.EXIT_NO_RESTART);
    }
  }

  #mapEnvironmentVariables() {
    const environmentVariables = [
      'SERVER_PORT',
      'SERVER_BASE_URL',
      'HTTP_ROUTE',
      'ALLOWED_HOSTS',
      'ALLOWED_ORIGINS',
      'DATABASE_URL',
      'HASH_SECRET',
    ];

    return environmentVariables;
  }
}

/**********************************************************************************/

export default EnvironmentManager;
