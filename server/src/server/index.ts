import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { MessageQueue } from '@adamakiva/movie-reservation-system-message-queue';
import { ERROR_CODES } from '@adamakiva/movie-reservation-system-shared';
import compress from 'compression';
import express, { type Express } from 'express';

import { Database } from '../database/index.ts';
import * as routers from '../entities/index.ts';
import {
  cancelShowtime,
  cancelShowtimeReservations,
  reserveShowtimeTicket,
} from '../entities/showtime/service/consumer.ts';
import type { EnvironmentVariables } from '../utils/config.ts';
import type { Logger } from '../utils/logger.ts';

import * as Middlewares from './middlewares/index.ts';
import { Cronjob } from './services/cronjob.ts';
import {
  AuthenticationManager,
  FileManager,
  WebsocketServer,
} from './services/index.ts';

/**********************************************************************************/

class HttpServer {
  readonly #authentication;
  readonly #fileManager;
  readonly #cronjob;
  readonly #database;
  readonly #messageQueue;
  readonly #websocketServer;
  readonly #routes;
  readonly #logger;
  readonly #server;

  public static async create(params: {
    authenticationParams: Parameters<typeof AuthenticationManager.create>[0];
    databaseParams: Omit<ConstructorParameters<typeof Database>[0], 'logger'>;
    fileManagerParams: Omit<
      ConstructorParameters<typeof FileManager>[0],
      'logger'
    >;
    cronjobParams: Omit<
      ConstructorParameters<typeof Cronjob>[0],
      'database' | 'logger'
    >;
    messageQueueParams: EnvironmentVariables['messageQueue'];
    websocketServerParams: Omit<
      ConstructorParameters<typeof WebsocketServer>[0],
      'server' | 'authentication' | 'logger'
    >;
    allowedMethods: readonly string[];
    routes: { http: string };
    httpServerConfigurations: EnvironmentVariables['httpServer']['configurations'];
    adminRoleId: string;
    logger: Logger;
  }) {
    const {
      authenticationParams,
      databaseParams,
      fileManagerParams,
      cronjobParams,
      messageQueueParams,
      websocketServerParams,
      allowedMethods,
      routes,
      httpServerConfigurations,
      adminRoleId,
      logger,
    } = params;

    const authentication =
      await AuthenticationManager.create(authenticationParams);
    const database = new Database({ ...databaseParams, logger });
    const fileManager = new FileManager({ ...fileManagerParams, logger });
    const cronjob = new Cronjob({ ...cronjobParams, database, logger });
    const messageQueue = new MessageQueue({
      connectionOptions: { url: messageQueueParams.url },
      logger,
    });

    const app = express().use(
      Middlewares.checkMethod(allowedMethods),
      compress(),
    );
    app.locals = {
      authentication,
      database,
      fileManager,
      messageQueue,
      logger,
    } as const;

    const server = createServer(app);
    const websocketServer = new WebsocketServer({
      ...websocketServerParams,
      server,
      authentication,
      logger,
    });

    const self = new HttpServer({
      authentication,
      database,
      fileManager,
      cronjob,
      messageQueue: { handler: messageQueue, options: messageQueueParams },
      websocketServer,
      routes,
      logger,
      server,
    })
      .#attachServerConfigurations(httpServerConfigurations)
      .#attachRoutesMiddlewares(app, adminRoleId);

    return self;
  }

  public async listen(port?: number) {
    const actualPort = await new Promise<number>((resolve) => {
      this.#server.once('listening', () => {
        // Can be asserted since this is not a unix socket and we are inside
        // the listen event
        const { address, port } = this.#server.address() as AddressInfo;

        this.#logger.info(
          `Server is running on: ` +
            `'${address.endsWith(':') ? address : address.concat(':')}${port}'`,
        );

        resolve(port);
      });

      this.#server.listen(port);
    });

    return actualPort;
  }

  public getAuthenticationManager() {
    return this.#authentication;
  }

  public getFileManager() {
    return this.#fileManager;
  }

  public getDatabase() {
    return this.#database;
  }

  public getMessageQueue() {
    return this.#messageQueue;
  }

  public getWebsocketServer() {
    return this.#websocketServer;
  }

  public async close() {
    let exitCode = 0;

    const results = await Promise.allSettled([
      this.#database.close(),
      this.#cronjob.stopAll(),
      this.#messageQueue.close(),
    ]);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.#logger.error(result.reason, 'Error during server termination');
        exitCode = ERROR_CODES.EXIT_NO_RESTART;
      }
    });

    this.#websocketServer.close();
    this.#server.close();

    return exitCode;
  }

  /********************************************************************************/

  private constructor(params: {
    authentication: AuthenticationManager;
    database: Database;
    fileManager: FileManager;
    cronjob: Cronjob;
    messageQueue: {
      options: EnvironmentVariables['messageQueue'];
      handler: MessageQueue;
    };
    websocketServer: WebsocketServer;
    routes: { http: string };
    logger: Logger;
    server: Server;
  }) {
    const {
      authentication,
      database,
      fileManager,
      cronjob,
      messageQueue,
      websocketServer,
      routes,
      logger,
      server,
    } = params;

    this.#authentication = authentication;
    this.#database = database;
    this.#fileManager = fileManager;
    this.#cronjob = cronjob;
    this.#messageQueue = messageQueue.handler;
    this.#websocketServer = websocketServer;
    this.#routes = routes;
    this.#logger = logger;
    this.#server = server.once('error', this.#errorEventHandler.bind(this));

    this.#initMessageQueue(messageQueue.options.consumer);
  }

  async #errorEventHandler(error: Error) {
    this.#logger.error(error, 'HTTP Server error');

    await this.close();

    process.exit(ERROR_CODES.EXIT_RESTART);
  }

  #initMessageQueue(
    consumerOptions: EnvironmentVariables['messageQueue']['consumer'],
  ) {
    const { concurrency, prefetchCount } = consumerOptions;

    this.#messageQueue
      .createPublishers({
        ticket: {
          confirm: true,
          maxAttempts: 32,
          routing: [
            {
              exchange: 'mrs',
              queue: 'mrs.ticket.reserve',
              routingKey: 'mrs-ticket-reserve',
            },
            {
              exchange: 'mrs',
              queue: 'mrs.ticket.cancel',
              routingKey: 'mrs-ticket-cancel',
            },
          ],
        },
        showtime: {
          confirm: true,
          maxAttempts: 32,
          routing: [
            {
              exchange: 'mrs',
              queue: 'mrs.showtime.cancel',
              routingKey: 'mrs-showtime-cancel',
            },
          ],
        },
      })
      .createConsumer({
        concurrency,
        qos: { prefetchCount },
        routing: {
          exchange: 'mrs',
          queue: 'mrs.ticket.reserve.reply.to',
          routingKey: 'mrs-ticket-reserve-reply-to',
        },
        handler: reserveShowtimeTicket({
          database: this.#database,
          websocketServer: this.#websocketServer,
          logger: this.#logger,
        }),
      })
      .createConsumer({
        concurrency,
        qos: { prefetchCount },
        routing: {
          exchange: 'mrs',
          queue: 'mrs.ticket.cancel.reply.to',
          routingKey: 'mrs-ticket-cancel-reply-to',
        },
        handler: cancelShowtimeReservations({
          database: this.#database,
          websocketServer: this.#websocketServer,
          logger: this.#logger,
        }),
      })
      .createConsumer({
        concurrency,
        qos: { prefetchCount },
        routing: {
          exchange: 'mrs',
          queue: 'mrs.showtime.cancel.reply.to',
          routingKey: 'mrs-showtime-cancel-reply-to',
        },
        handler: cancelShowtime(this.#database),
      });
  }

  #attachServerConfigurations(
    httpServerConfigurations: EnvironmentVariables['httpServer']['configurations'],
  ) {
    const {
      maxHeadersCount,
      headersTimeout,
      requestTimeout,
      timeout,
      maxRequestsPerSocket,
      keepAliveTimeout,
    } = httpServerConfigurations;

    // Every configuration referring to sockets here, talks about network/tcp
    // socket NOT websockets. Network socket is the underlying layer for http
    // request (in this case). In short, the socket options refer to a "standard"
    // connection from a client
    this.#server.maxHeadersCount = maxHeadersCount;
    this.#server.headersTimeout = headersTimeout;
    this.#server.requestTimeout = requestTimeout;
    // Connection close will terminate the tcp socket once the payload was
    // transferred and acknowledged. This setting is for the rare cases where,
    // for some reason, the tcp socket is left alive
    this.#server.timeout = timeout;
    // See: https://github.com/nodejs/node/issues/40071
    // Leaving this without any limit will cause the server to reuse the
    // connection indefinitely (in theory). As a result, load balancing will
    // have very little effects if more instances of the server are brought up
    // by the deployment orchestration tool.
    // As for a good number, it depends on the application traffic
    this.#server.maxRequestsPerSocket = maxRequestsPerSocket;
    this.#server.keepAliveTimeout = keepAliveTimeout;

    return this;
  }

  #attachRoutesMiddlewares(app: Express, adminRoleId: string) {
    // The order matters
    app
      .use(routers.healthcheckRouter)
      // No point in logging all healthcheck requests
      .use(this.#logger.logMiddleware)
      .use(
        this.#routes.http,
        routers.authenticationRouter,
        this.#authentication.httpAuthenticationMiddleware(),
        routers.roleRouter(adminRoleId),
        routers.userRouter(adminRoleId),
        routers.genreRouter(adminRoleId),
        routers.movieRouter(this.#fileManager, adminRoleId),
        routers.hallRouter(adminRoleId),
        routers.showtimeRouter(adminRoleId),
      )
      .use('/', Middlewares.handleNonExistentRoute, Middlewares.errorHandler);

    return this;
  }
}

/**********************************************************************************/

export { HttpServer };
