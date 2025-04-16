import { ERROR_CODES } from '@adamakiva/movie-reservation-system-shared';

import type { Logger } from './logger.ts';

/**********************************************************************************/

class EnvironmentManager {
  readonly #logger;
  readonly #environmentVariables;

  static readonly #REQUIRED_ENVIRONMENT_VARIABLES = new Set([
    'SERVER_PORT',
    'SERVER_BASE_URL',
    'HTTP_ROUTE',
    'ALLOWED_HOSTS',
    'ALLOWED_ORIGINS',
    'DATABASE_URL',
    'MESSAGE_QUEUE_URL',
    'AUTHENTICATION_HASH_SECRET',
  ] as const);

  public constructor(logger: Logger) {
    this.#logger = logger;
    this.#checkForMissingEnvironmentVariables();

    this.#environmentVariables = {
      node: {
        maxSockets:
          this.#toNumber('NODE_MAX_SOCKETS', process.env.NODE_MAX_SOCKETS) ??
          Infinity,
        maxTotalSockets:
          this.#toNumber(
            'NODE_MAX_TOTAL_SOCKETS',
            process.env.NODE_MAX_TOTAL_SOCKETS,
          ) ?? Infinity,
        defaultHighWaterMark:
          this.#toNumber(
            'NODE_DEFAULT_HIGH_WATERMARK',
            process.env.NODE_DEFAULT_HIGH_WATERMARK,
          ) ?? 65_536,
      },
      server: {
        port: this.#toNumber('SERVER_PORT', process.env.SERVER_PORT)!,
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
      database: {
        url: process.env.DATABASE_URL!,
        maxConnections:
          this.#toNumber(
            'DATABASE_MAX_CONNECTIONS',
            process.env.DATABASE_MAX_CONNECTIONS,
          ) ?? 32,
        statementTimeout:
          this.#toNumber(
            'DATABASE_STATEMENT_TIMEOUT',
            process.env.DATABASE_STATEMENT_TIMEOUT,
          ) ?? 30_000,
        transactionTimeout:
          this.#toNumber(
            'DATABASE_TRANSACTION_TIMEOUT',
            process.env.DATABASE_TRANSACTION_TIMEOUT,
          ) ?? 60_000,
      },
      messageQueue: {
        url: process.env.MESSAGE_QUEUE_URL!,
      },
      jwt: {
        accessTokenExpiration:
          this.#toNumber(
            'AUTHENTICATION_ACCESS_TOKEN_EXPIRATION',
            process.env.AUTHENTICATION_ACCESS_TOKEN_EXPIRATION,
          ) ?? 900, // 15 Minutes
        refreshTokenExpiration:
          this.#toNumber(
            'AUTHENTICATION_REFRESH_TOKEN_EXPIRATION',
            process.env.AUTHENTICATION_REFRESH_TOKEN_EXPIRATION,
          ) ?? 2_629_746, // 1 Month
        hash: Buffer.from(process.env.AUTHENTICATION_HASH_SECRET!),
      },
    } as const;
  }

  public getEnvVariables() {
    return this.#environmentVariables;
  }

  /********************************************************************************/

  #checkForMissingEnvironmentVariables() {
    const errorMessages: string[] = [];
    EnvironmentManager.#REQUIRED_ENVIRONMENT_VARIABLES.forEach((key) => {
      if (!process.env[key]) {
        errorMessages.push(`* Missing ${key} environment variable`);
      }
    });
    if (errorMessages.length) {
      this.#logger.fatal(errorMessages.join('\n'));

      process.exit(ERROR_CODES.EXIT_NO_RESTART);
    }
  }

  #toNumber(key: string, value: string | undefined) {
    if (!value) {
      return undefined;
    }

    const valueAsNumber = Number(value);

    if (isNaN(valueAsNumber)) {
      this.#logger.fatal(`Invalid value for '${key}' environment variable`);

      process.exit(ERROR_CODES.EXIT_NO_RESTART);
    }

    return valueAsNumber;
  }
}

/**********************************************************************************/

export { EnvironmentManager };
