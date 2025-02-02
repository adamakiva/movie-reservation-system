import { createServer, type Server } from 'node:http';

import compress from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import type { AddressInfo } from 'node:net';

import { Database } from '../database/index.js';
import * as routers from '../entities/index.js';
import {
  ERROR_CODES,
  type LoggerHandler,
  type LogMiddleware,
} from '../utils/index.js';

import {
  AuthenticationManager,
  FileManager,
  Middlewares,
} from './services/index.js';

/**********************************************************************************/

class HttpServer {
  readonly #database;
  readonly #authentication;
  readonly #fileManager;
  readonly #server;
  readonly #routes;
  readonly #requestContext;
  readonly #logger;

  public static async create(params: {
    authenticationParams: Parameters<typeof AuthenticationManager.create>[0];
    fileManagerParams: ConstructorParameters<typeof FileManager>[0];
    corsOptions: Parameters<typeof cors>[0];
    databaseParams: Omit<ConstructorParameters<typeof Database>[0], 'logger'>;
    allowedMethods: Set<string>;
    routes: { http: string };
    logMiddleware: LogMiddleware;
    logger: LoggerHandler;
  }) {
    const {
      authenticationParams,
      fileManagerParams,
      corsOptions,
      databaseParams,
      allowedMethods,
      routes,
      logMiddleware,
      logger,
    } = params;

    const authentication =
      await AuthenticationManager.create(authenticationParams);
    const fileManager = new FileManager(fileManagerParams);
    const database = new Database({ ...databaseParams, logger });

    const app = express().use(
      Middlewares.checkMethod(allowedMethods),
      cors(corsOptions),
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
      server,
      routes,
      logger,
    });

    // The order matters
    self.#attachServerConfigurations();
    self.#attachServerEventHandlers();
    self.#attachRoutesMiddlewares(app, logMiddleware);

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

  public close() {
    this.#server.close();
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

  /********************************************************************************/

  private constructor(params: {
    authentication: AuthenticationManager;
    fileManager: FileManager;
    database: Database;
    server: Server;
    routes: { http: string };
    logger: LoggerHandler;
  }) {
    const { authentication, fileManager, database, server, routes, logger } =
      params;

    this.#authentication = authentication;
    this.#fileManager = fileManager;
    this.#database = database;
    this.#server = server;
    this.#routes = routes;
    this.#logger = logger;

    this.#requestContext = {
      authentication,
      fileManager,
      database,
      logger,
    };
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

  #attachServerEventHandlers() {
    // When a function is passed as a callback (even a method), the `this`
    // context is lost (if it's not an arrow function). There are a couple
    // of options to resolve said issue:
    // 1. Make `this._healthCheck` an arrow function
    // 2. Inline implementation as an anonymous arrow function
    // 3. Bind `this` context to the called function
    // We chose number 3 to be in line with the rest of the style of
    // the application
    this.#server
      .once('error', this.#handleErrorEvent.bind(this))
      // On purpose since the process is shutting-down anyhow
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      .once('close', this.#handleCloseEvent.bind(this));
  }

  #handleErrorEvent(err: Error) {
    this.#logger.fatal(err, 'HTTP Server error');

    // If an event emitter error happened, we shutdown the application.
    // As a result we allow the deployment orchestration tool to attempt to
    // rerun the application in a "clean" state
    process.exit(ERROR_CODES.EXIT_RESTART);
  }

  async #handleCloseEvent() {
    let exitCode = 0;
    const results = await Promise.allSettled([this.#database.close()]);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.#logger.fatal(result.reason, 'Error during server termination');
        exitCode = ERROR_CODES.EXIT_NO_RESTART;
      }
    });
    if (exitCode) {
      process.exit(exitCode);
    }

    process.exitCode = 0;
  }

  #attachRoutesMiddlewares(app: Express, logMiddleware: LogMiddleware) {
    // The order matters
    app
      // Attach context to every request
      .use((_req, res, next) => {
        res.locals.context = this.#requestContext;

        next();
      })
      .use(routers.healthcheckRouter)
      .use(logMiddleware)
      .use(
        this.#routes.http,
        routers.authenticationRouter,
        routers.roleRouter(this.#authentication),
        routers.userRouter(this.#authentication),
        routers.genreRouter(this.#authentication),
        routers.movieRouter(this.#authentication, this.#fileManager),
        routers.hallRouter(this.#authentication),
        routers.showtimeRouter(this.#authentication),
      )
      .use(Middlewares.handleNonExistentRoute, Middlewares.errorHandler);
  }
}

/**********************************************************************************/

export default HttpServer;
