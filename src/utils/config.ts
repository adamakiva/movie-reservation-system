import { ERROR_CODES } from './constants.js';
import {
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
} from './functions.js';
import type { LoggerHandler } from './logger.js';

/**********************************************************************************/

type Mode = 'development' | 'test' | 'production';

type EnvironmentVariables = {
  mode: Mode;
  server: {
    port: string;
    baseUrl: string;
    httpRoute: string;
    healthCheckRoute: string;
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
  readonly #mode;
  readonly #environmentVariables;

  public constructor(logger: LoggerHandler, mode?: string) {
    this.#logger = logger;
    this.#mode = this.#checkRuntimeMode(mode);
    this.#checkForMissingEnvironmentVariables();

    this.#environmentVariables = {
      mode: this.#mode,
      server: {
        port: process.env.SERVER_PORT!,
        baseUrl: process.env.SERVER_BASE_URL!,
        httpRoute: process.env.HTTP_ROUTE!,
        healthCheckRoute: process.env.HEALTH_CHECK_ROUTE!,
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

  #checkRuntimeMode(mode?: string) {
    if (isDevelopmentMode(mode) || isTestMode(mode) || isProductionMode(mode)) {
      return mode as Mode;
    }

    this.#logger.fatal(
      `Missing or invalid 'NODE_ENV' env value, should never happen.` +
        ' Unresolvable, exiting...',
    );

    return process.exit(ERROR_CODES.EXIT_NO_RESTART);
  }

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
      'HEALTH_CHECK_ROUTE',
      'ALLOWED_HOSTS',
      'ALLOWED_ORIGINS',
      'DATABASE_URL',
      'HASH_SECRET',
    ];
    if (this.#mode !== 'production') {
      environmentVariables.push('DATABASE_TEST_URL', 'SERVER_DEBUG_PORT');
    }

    return environmentVariables;
  }
}

/**********************************************************************************/

export default EnvironmentManager;
export type { Mode };
