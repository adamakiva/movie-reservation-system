import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  ERROR_CODES,
  type MESSAGE_QUEUE,
} from '@adamakiva/movie-reservation-system-shared';
import compress from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';

import { Database } from '../database/index.ts';
import * as routers from '../entities/index.ts';
import {
  cancelShowtimeReservations,
  reserveShowtimeTicket,
} from '../entities/showtime/service/utils.ts';
import type { Logger, LogMiddleware } from '../utils/logger.ts';
import type { RequestContext } from '../utils/types.ts';

import { Middlewares } from './middlewares/index.ts';
import {
  AuthenticationManager,
  FileManager,
  MessageQueue,
} from './services/index.ts';

/**********************************************************************************/

class HttpServer {
  readonly #authentication;
  readonly #fileManager;
  readonly #database;
  readonly #messageQueue;
  readonly #server;
  readonly #routes;
  readonly #requestContext;
  readonly #logger;

  public static async create(params: {
    authenticationParams: Parameters<typeof AuthenticationManager.create>[0];
    fileManagerParams: Omit<
      ConstructorParameters<typeof FileManager>[0],
      'logger'
    >;
    messageQueueParams: Omit<
      ConstructorParameters<typeof MessageQueue>[0],
      'logger'
    > & { routing: typeof MESSAGE_QUEUE };
    corsOptions: Omit<Parameters<typeof cors>[0], 'methods'>;
    databaseParams: Omit<ConstructorParameters<typeof Database>[0], 'logger'>;
    allowedMethods: readonly string[];
    routes: { http: string };
    logMiddleware: LogMiddleware;
    logger: Logger;
  }) {
    const {
      authenticationParams,
      fileManagerParams,
      corsOptions,
      databaseParams,
      messageQueueParams,
      allowedMethods,
      routes,
      logMiddleware,
      logger,
    } = params;

    const authentication =
      await AuthenticationManager.create(authenticationParams);
    const fileManager = new FileManager({ ...fileManagerParams, logger });
    const database = new Database({ ...databaseParams, logger });
    const messageQueue = new MessageQueue({
      connectionOptions: messageQueueParams.connectionOptions,
      logger,
    });

    const app = express().use(
      Middlewares.checkMethod(allowedMethods),
      cors({ ...corsOptions, methods: allowedMethods.slice() }),
      compress(),
    );
    // Express type chain include extending IRouter which returns void | Promise<void>,
    // however, this is irrelevant for this use case (`app` type)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const server = createServer(app);

    const self = new HttpServer({
      authentication,
      fileManager,
      database,
      messageQueue: {
        handler: messageQueue,
        routing: messageQueueParams.routing,
      },
      server,
      routes,
      logger,
    });

    // The order matters
    self.#attachServerConfigurations();
    self.#attachRoutesMiddlewares(app, logMiddleware);

    return self;
  }

  public async listen(port?: number) {
    // This function await for the async listen to emit the listening event before
    // returning. In addition it allows to listen to the server on a dynamic port
    // and returns it (used by the tests to run another server instance)
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

  public async close() {
    let exitCode = 0;

    (
      await Promise.allSettled([
        this.#database.close(),
        this.#messageQueue.close(),
      ])
    ).forEach((result) => {
      if (result.status === 'rejected') {
        this.#logger.fatal(result.reason, 'Error during server termination');
        exitCode = ERROR_CODES.EXIT_NO_RESTART;
      }
    });
    this.#server.close();

    return exitCode;
  }

  /********************************************************************************/

  private constructor(params: {
    authentication: AuthenticationManager;
    fileManager: FileManager;
    database: Database;
    messageQueue: {
      handler: MessageQueue;
      routing: Parameters<
        typeof HttpServer.create
      >[0]['messageQueueParams']['routing'];
    };
    server: Server;
    routes: { http: string };
    logger: Logger;
  }) {
    const {
      authentication,
      fileManager,
      database,
      messageQueue,
      server,
      routes,
      logger,
    } = params;

    this.#authentication = authentication;
    this.#fileManager = fileManager;
    this.#database = database;
    this.#messageQueue = messageQueue.handler;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.#server = server.once('error', this.#handleErrorEvent);
    this.#routes = routes;
    this.#logger = logger;

    this.#initMessageQueue(messageQueue.handler, messageQueue.routing);

    this.#requestContext = {
      authentication,
      fileManager,
      database,
      messageQueue: messageQueue.handler,
      logger,
    } as const satisfies RequestContext;
  }

  #initMessageQueue(
    messageQueue: MessageQueue,
    routing: Parameters<
      typeof HttpServer.create
    >[0]['messageQueueParams']['routing'],
  ) {
    messageQueue.createPublishers({
      ticket: {
        confirm: true,
        maxAttempts: 32,
        routing: [
          {
            exchange: routing.TICKET.RESERVE.SERVER.EXCHANGE_NAME,
            queue: routing.TICKET.RESERVE.SERVER.QUEUE_NAME,
            routingKey: routing.TICKET.RESERVE.SERVER.ROUTING_KEY_NAME,
          },
          {
            exchange: routing.TICKET.CANCEL.SERVER.EXCHANGE_NAME,
            queue: routing.TICKET.CANCEL.SERVER.QUEUE_NAME,
            routingKey: routing.TICKET.CANCEL.SERVER.ROUTING_KEY_NAME,
          },
        ],
      },
    });
    messageQueue.createConsumer({
      concurrency: 1,
      exclusive: true,
      routing: {
        exchange: routing.TICKET.RESERVE.CLIENT.EXCHANGE_NAME,
        queue: routing.TICKET.RESERVE.CLIENT.QUEUE_NAME,
        routingKey: routing.TICKET.RESERVE.CLIENT.ROUTING_KEY_NAME,
      },
      handler: reserveShowtimeTicket(this.#database),
    });
    messageQueue.createConsumer({
      concurrency: 1,
      exclusive: true,
      routing: {
        exchange: routing.TICKET.CANCEL.CLIENT.EXCHANGE_NAME,
        queue: routing.TICKET.CANCEL.CLIENT.QUEUE_NAME,
        routingKey: routing.TICKET.CANCEL.CLIENT.ROUTING_KEY_NAME,
      },
      handler: cancelShowtimeReservations(this.#database),
    });
  }

  #attachServerConfigurations() {
    // Every configuration referring to sockets here, talks about network/tcp
    // socket NOT websockets. Network socket is the underlying layer for http
    // request (in this case). In short, the socket options refer to a "standard"
    // connection from a client
    this.#server.maxHeadersCount = 64;
    this.#server.headersTimeout = 8_000; // millis
    this.#server.requestTimeout = 16_000; // millis
    // Connection close will terminate the tcp socket once the payload was
    // transferred and acknowledged. This setting is for the rare cases where,
    // for some reason, the tcp socket is left alive
    this.#server.timeout = 60_000; // millis
    // See: https://github.com/nodejs/node/issues/40071
    // Leaving this without any limit will cause the server to reuse the
    // connection indefinitely (in theory). As a result, load balancing will
    // have very little effects if more instances of the server are brought up
    // by the deployment orchestration tool.
    // As for a good number, it depends on the application traffic
    this.#server.maxRequestsPerSocket = 32;
    this.#server.keepAliveTimeout = 8_000; // millis
    this.#server.maxConnections = 8_000;
  }

  #attachRoutesMiddlewares(app: Express, logMiddleware: LogMiddleware) {
    // The order matters
    app
      // Attach context to every request
      .use(Middlewares.attachRequestContext(this.#requestContext))
      .use(routers.healthcheckRouter)
      // No point in logging all healthcheck requests
      .use(logMiddleware)
      .use(
        this.#routes.http,
        routers.authenticationRouter,
        this.#authentication.httpAuthenticationMiddleware(),
        routers.roleRouter,
        routers.userRouter,
        routers.genreRouter,
        routers.movieRouter(this.#fileManager),
        routers.hallRouter,
        routers.showtimeRouter,
      )
      .use('/', Middlewares.handleNonExistentRoute, Middlewares.errorHandler);
  }

  /********************************************************************************/

  readonly #handleErrorEvent = async (error: Error) => {
    this.#logger.fatal(error, 'HTTP Server error');

    await this.close();

    // If an http server error happened, we shutdown the application with status
    // code that indicates that a server restart should happen
    process.exit(ERROR_CODES.EXIT_RESTART);
  };
}

/**********************************************************************************/

export { HttpServer };
