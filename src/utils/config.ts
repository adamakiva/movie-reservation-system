import { globalAgent } from 'node:http';
import { Stream } from 'node:stream';

import { ERROR_CODES } from './constants.js';
import {
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
} from './functions.js';

/**********************************************************************************/

type Mode = 'development' | 'test' | 'production';

type EnvironmentVariables = {
  mode: Mode;
  server: {
    port: string;
    baseUrl: string;
    httpRoute: string;
    healthCheckRoute: string;
    allowedHosts: string[];
    allowedOrigins: string[];
  };
  dbUrl: string;
};

/**********************************************************************************/

class EnvironmentManager {
  readonly #environmentVariables;

  public constructor() {
    const mode = this.#checkRuntimeMode(process.env.NODE_ENV);
    this.#checkForMissingEnvironmentVariables(mode);

    this.#environmentVariables = {
      mode: mode,
      server: {
        port: process.env.SERVER_PORT!,
        baseUrl: process.env.SERVER_BASE_URL!,
        httpRoute: process.env.HTTP_ROUTE!,
        healthCheckRoute: process.env.HEALTH_CHECK_ROUTE!,
        allowedHosts: process.env.ALLOWED_HOSTS!.split(','),
        allowedOrigins: process.env.ALLOWED_ORIGINS!.split(','),
      },
      dbUrl: process.env.DB_URL!,
    } as const satisfies EnvironmentVariables;

    // The default stack trace limit is 10 calls. Increasing it to a number which
    // we'll never have to think about it again
    Error.stackTraceLimit = 256;

    // To prevent DOS attacks, See: https://nodejs.org/en/learn/getting-started/security-best-practices#denial-of-service-of-http-server-cwe-400
    globalAgent.maxSockets = 128;
    globalAgent.maxTotalSockets = 1024;

    // Limit the stream internal buffer to 256kb (default is 64kb)
    Stream.setDefaultHighWaterMark(false, 262_144);
  }

  public getEnvVariables() {
    return this.#environmentVariables;
  }

  /********************************************************************************/

  #checkRuntimeMode(mode?: string) {
    if (isDevelopmentMode(mode) || isTestMode(mode) || isProductionMode(mode)) {
      return mode as Mode;
    }

    console.error(
      `Missing or invalid 'NODE_ENV' env value, should never happen.` +
        ' Unresolvable, exiting...',
    );

    process.exit(ERROR_CODES.EXIT_NO_RESTART);
  }

  #checkForMissingEnvironmentVariables(mode: Mode) {
    let errorMessages: string[] = [];
    this.#mapEnvironmentVariables(mode).forEach((key) => {
      if (!process.env[key]) {
        errorMessages.push(`* Missing ${key} environment variable`);
      }
    });
    if (errorMessages.length) {
      console.error(errorMessages.join('\n'));

      process.exit(ERROR_CODES.EXIT_NO_RESTART);
    }
  }

  #mapEnvironmentVariables(mode: Mode) {
    const environmentVariables = [
      'SERVER_PORT',
      'SERVER_BASE_URL',
      'HTTP_ROUTE',
      'HEALTH_CHECK_ROUTE',
      'ALLOWED_HOSTS',
      'ALLOWED_ORIGINS',
      'DB_URL',
    ];
    if (mode !== 'production') {
      environmentVariables.push('DB_TEST_URL', 'SERVER_DEBUG_PORT');
    }

    return environmentVariables;
  }
}

/**********************************************************************************/

export default EnvironmentManager;
