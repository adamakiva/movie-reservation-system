import { Buffer } from 'node:buffer';
import { globalAgent } from 'node:http';
import Stream from 'node:stream';

import { ERROR_CODES } from '@adamakiva/movie-reservation-system-shared';

import type { Logger } from './logger.ts';

/**********************************************************************************/

type EnvironmentVariables = ReturnType<EnvironmentManager['getEnvVariables']>;

const REQUIRED_ENVIRONMENT_VARIABLES = [
  'SERVER_PORT',
  'SERVER_BASE_URL',
  'HTTP_ROUTE',
  'ALLOWED_HOSTS',
  'DATABASE_URL',
  'DATABASE_MAX_CONNECTIONS',
  'DATABASE_STATEMENT_TIMEOUT',
  'DATABASE_TRANSACTION_TIMEOUT',
  'MESSAGE_QUEUE_URL',
  'MESSAGE_QUEUE_CONSUMER_CONCURRENCY',
  'MESSAGE_QUEUE_CONSUMER_PREFETCH_COUNT',
  'AUTHENTICATION_HASH_SECRET',
  'AUTHENTICATION_ACCESS_TOKEN_EXPIRATION',
  'AUTHENTICATION_REFRESH_TOKEN_EXPIRATION',
  'WEBSOCKET_SERVER_BASE_URL',
  'WEBSOCKET_SERVER_PING_TIME',
  'WEBSOCKET_SERVER_BACKLOG',
  'WEBSOCKET_SERVER_MAX_PAYLOAD',
  'HTTP_SERVER_MAX_HEADERS_COUNT',
  'HTTP_SERVER_HEADERS_TIMEOUT',
  'HTTP_SERVER_REQUEST_TIMEOUT',
  'HTTP_SERVER_TIMEOUT',
  'HTTP_SERVER_MAX_REQUESTS_PER_SOCKET',
  'HTTP_SERVER_KEEP_ALIVE_TIMEOUT',
  'NODE_MAX_SOCKETS',
  'NODE_MAX_TOTAL_SOCKETS',
  'NODE_DEFAULT_HIGH_WATERMARK',
  'ADMIN_ROLE_ID',
] as const;

/**********************************************************************************/

class EnvironmentManager {
  readonly #logger;
  readonly #environmentVariables;

  public constructor(logger: Logger) {
    this.#logger = logger;
    this.#checkForMissingEnvironmentVariables();

    this.#environmentVariables = {
      node: {
        maxSockets: this.#toNumber(
          'NODE_MAX_SOCKETS',
          process.env.NODE_MAX_SOCKETS,
        )!,
        maxTotalSockets: this.#toNumber(
          'NODE_MAX_TOTAL_SOCKETS',
          process.env.NODE_MAX_TOTAL_SOCKETS,
        )!,
        defaultHighWaterMark: this.#toNumber(
          'NODE_DEFAULT_HIGH_WATERMARK',
          process.env.NODE_DEFAULT_HIGH_WATERMARK,
        )!,
        pipeTimeout: this.#toNumber(
          'NODE_PIPE_TIMEOUT',
          process.env.NODE_PIPE_TIMEOUT,
        )!,
      },
      httpServer: {
        port: this.#toNumber('SERVER_PORT', process.env.SERVER_PORT)!,
        baseUrl: process.env.SERVER_BASE_URL!,
        route: process.env.HTTP_ROUTE!,
        allowedHosts: process.env.ALLOWED_HOSTS!.split(','),
        allowedMethods: [
          'HEAD',
          'GET',
          'POST',
          'PUT',
          'PATCH',
          'DELETE',
          'OPTIONS',
        ],
        configurations: {
          maxHeadersCount: this.#toNumber(
            'HTTP_SERVER_MAX_HEADERS_COUNT',
            process.env.HTTP_SERVER_MAX_HEADERS_COUNT,
          )!,
          headersTimeout: this.#toNumber(
            'HTTP_SERVER_HEADERS_TIMEOUT',
            process.env.HTTP_SERVER_HEADERS_TIMEOUT,
          )!,
          requestTimeout: this.#toNumber(
            'HTTP_SERVER_REQUEST_TIMEOUT',
            process.env.HTTP_SERVER_REQUEST_TIMEOUT,
          )!,
          timeout: this.#toNumber(
            'HTTP_SERVER_TIMEOUT',
            process.env.HTTP_SERVER_TIMEOUT,
          )!,
          maxRequestsPerSocket: this.#toNumber(
            'HTTP_SERVER_MAX_REQUESTS_PER_SOCKET',
            process.env.HTTP_SERVER_MAX_REQUESTS_PER_SOCKET,
          )!,
          keepAliveTimeout: this.#toNumber(
            'HTTP_SERVER_KEEP_ALIVE_TIMEOUT',
            process.env.HTTP_SERVER_KEEP_ALIVE_TIMEOUT,
          )!,
        },
      },
      websocketServer: {
        route: process.env.WEBSOCKET_SERVER_BASE_URL!,
        pingTime: this.#toNumber(
          'WEBSOCKET_SERVER_PING_TIME',
          process.env.WEBSOCKET_SERVER_PING_TIME,
        )!,
        backlog: this.#toNumber(
          'WEBSOCKET_SERVER_BACKLOG',
          process.env.WEBSOCKET_SERVER_BACKLOG,
        )!,
        maxPayload: this.#toNumber(
          'WEBSOCKET_SERVER_MAX_PAYLOAD',
          process.env.WEBSOCKET_SERVER_MAX_PAYLOAD,
        )!,
      },
      database: {
        url: process.env.DATABASE_URL!,
        maxConnections: this.#toNumber(
          'DATABASE_MAX_CONNECTIONS',
          process.env.DATABASE_MAX_CONNECTIONS,
        )!,
        statementTimeout: this.#toNumber(
          'DATABASE_STATEMENT_TIMEOUT',
          process.env.DATABASE_STATEMENT_TIMEOUT,
        )!,
        transactionTimeout: this.#toNumber(
          'DATABASE_TRANSACTION_TIMEOUT',
          process.env.DATABASE_TRANSACTION_TIMEOUT,
        )!,
      },
      messageQueue: {
        url: process.env.MESSAGE_QUEUE_URL!,
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
      },
      jwt: {
        accessTokenExpiration: this.#toNumber(
          'AUTHENTICATION_ACCESS_TOKEN_EXPIRATION',
          process.env.AUTHENTICATION_ACCESS_TOKEN_EXPIRATION,
        )!,
        refreshTokenExpiration: this.#toNumber(
          'AUTHENTICATION_REFRESH_TOKEN_EXPIRATION',
          process.env.AUTHENTICATION_REFRESH_TOKEN_EXPIRATION,
        )!,
        hash: Buffer.from(process.env.AUTHENTICATION_HASH_SECRET!),
      },
      adminRoleId: process.env.ADMIN_ROLE_ID!,
    } as const;

    this.#setGlobalValues({
      maxSockets: this.#toNumber(
        'NODE_MAX_SOCKETS',
        process.env.NODE_MAX_SOCKETS,
      )!,
      maxTotalSockets: this.#toNumber(
        'NODE_MAX_TOTAL_SOCKETS',
        process.env.NODE_MAX_TOTAL_SOCKETS,
      )!,
      defaultHighWaterMark: this.#toNumber(
        'NODE_DEFAULT_HIGH_WATERMARK',
        process.env.NODE_DEFAULT_HIGH_WATERMARK,
      )!,
    });
  }

  public getEnvVariables() {
    return this.#environmentVariables;
  }

  /********************************************************************************/

  #checkForMissingEnvironmentVariables() {
    const errorMessages: string[] = [];
    REQUIRED_ENVIRONMENT_VARIABLES.forEach((key) => {
      if (!process.env[key]) {
        errorMessages.push(`* Missing ${key} environment variable`);
      }
    });
    if (errorMessages.length) {
      this.#logger.error(errorMessages.join('\n'));

      process.exit(ERROR_CODES.EXIT_NO_RESTART);
    }
  }

  #toNumber(key: string, value?: string) {
    if (!value) {
      return undefined;
    }

    const valueAsNumber = Number(value);
    if (isNaN(valueAsNumber)) {
      this.#logger.error(`Invalid value for '${key}' environment variable`);

      process.exit(ERROR_CODES.EXIT_NO_RESTART);
    }

    return valueAsNumber;
  }

  #setGlobalValues(params: {
    maxSockets: number;
    maxTotalSockets: number;
    defaultHighWaterMark: number;
  }) {
    const { maxSockets, maxTotalSockets, defaultHighWaterMark } = params;

    // See: https://nodejs.org/api/events.html#capture-rejections-of-promises
    Stream.EventEmitter.captureRejections = true;
    // Set the default high water mark for Readable/Writeable streams
    Stream.setDefaultHighWaterMark(false, defaultHighWaterMark);

    // To prevent DOS attacks, See: https://nodejs.org/en/learn/getting-started/security-best-practices#denial-of-service-of-http-server-cwe-400
    globalAgent.maxSockets = maxSockets;
    globalAgent.maxTotalSockets = maxTotalSockets;
  }
}

/**********************************************************************************/

export { EnvironmentManager, type EnvironmentVariables };
