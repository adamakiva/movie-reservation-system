import compress from 'compression';
import express, { type Express } from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type pg from 'postgres';

import { Database } from '../db/index.js';
import {
  ERROR_CODES,
  isProductionMode,
  isTestMode,
  type LoggerHandler,
  type LogMiddleware,
  type Mode,
} from '../utils/index.js';

import { healthCheckRouter } from '../routers/index.js';
import * as Middlewares from './middlewares.js';

/**********************************************************************************/

class HttpServer {
  readonly #mode;
  readonly #server;
  readonly #db;
  readonly #routes;
  readonly #requestContext;
  readonly #logger;

  /********************************************************************************/

  public static async create(params: {
    mode: Mode;
    dbParams: {
      url: string;
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      options?: pg.Options<{}>;
      healthCheckQuery: string;
    };
    allowedMethods: Set<string>;
    routes: { http: string; health: string };
    logMiddleware: LogMiddleware;
    logger: LoggerHandler;
  }) {
    const { mode, dbParams, allowedMethods, routes, logMiddleware, logger } =
      params;

    const db = new Database({ ...dbParams, logger });

    const app = express().disable('x-powered-by');
    // Express type chain include extending IRouter which returns void | Promise<void>,
    // however, this is irrelevant for this use case
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const server = createServer(app);

    const self = new HttpServer({
      mode: mode,
      db: db,
      server: server,
      routes: routes,
      logger: logger,
    });

    self.#attachServerConfigurations();
    self.#attachServerEventHandlers();
    await self.#attachConfigurationMiddlewares(app, allowedMethods);
    self.#attachRoutesMiddlewares({
      app,
      routes: routes,
      logMiddleware,
    });

    return self;
  }

  public async listen(port?: number) {
    return await new Promise<number>((resolve) => {
      this.#server.once('listening', () => {
        if (!isTestMode(this.#mode)) {
          // Can be asserted since this is not a unix socket and we are inside
          // the listen event
          const { address, port } = this.#server.address() as AddressInfo;
          const route = this.#routes.http;

          this.#logger.info(
            `Server is running in '${this.#mode}' mode on: ` +
              `'${address.endsWith(':') ? address : address.concat(':')}${port}${route}'`,
          );
        }

        resolve((this.#server.address() as AddressInfo).port);
      });

      this.#server.listen(port);
    });
  }

  public close() {
    this.#server.close();
  }

  public getDatabase() {
    return this.#db;
  }

  /********************************************************************************/

  // Prevent creating the class via the constructor because it needs to be an
  // async creation
  private constructor(params: {
    mode: Mode;
    db: Database;
    server: Server;
    routes: { http: string; health: string };
    logger: LoggerHandler;
  }) {
    const { mode, db, server, routes, logger } = params;

    this.#mode = mode;
    this.#db = db;
    this.#server = server;
    this.#routes = routes;
    this.#logger = logger;

    this.#requestContext = {
      db: db,
      logger: logger,
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
    this.#logger.error(err, 'HTTP Server error');

    // If an event emitter error happened, we shutdown the application.
    // As a result we allow the deployment orchestration tool to attempt to
    // rerun the application in a "clean" state
    process.exit(ERROR_CODES.EXIT_RESTART);
  }

  // curl -X GET "localhost:4334/health/ready" -H "Custom-Header: $(head -c 80000 </dev/zero | tr '\0' 'A')"

  async #handleCloseEvent() {
    let exitCode = 0;
    const results = await Promise.allSettled([this.#db.close()]);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.#logger.error(result.reason, 'Error during server termination');
        exitCode = ERROR_CODES.EXIT_RESTART;
      }
    });
    if (exitCode) {
      process.exit(exitCode);
    }

    process.exitCode = 0;
  }

  async #attachConfigurationMiddlewares(
    app: Express,
    allowedMethods: Set<string>,
  ) {
    app.use(Middlewares.checkMethod(allowedMethods), compress());
    if (isProductionMode(this.#mode)) {
      app.use(
        (await import('helmet')).default({
          contentSecurityPolicy: true /* require-corp */,
          crossOriginEmbedderPolicy: { policy: 'require-corp' },
          crossOriginOpenerPolicy: { policy: 'same-origin' },
          crossOriginResourcePolicy: { policy: 'same-origin' },
          originAgentCluster: true,
          referrerPolicy: { policy: 'no-referrer' },
          strictTransportSecurity: {
            maxAge: 31_536_000, // 365 days in seconds
            includeSubDomains: true,
          },
          xContentTypeOptions: true,
          xDnsPrefetchControl: false,
          xDownloadOptions: true,
          xFrameOptions: { action: 'deny' },
          xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
          xXssProtection: true,
          xPoweredBy: false,
        }),
      );
    }
  }

  #attachRoutesMiddlewares(params: {
    app: Express;
    routes: { http: string; health: string };
    logMiddleware: LogMiddleware;
  }) {
    const {
      app,
      routes: { http: httpRoute, health: healthCheckRoute },
      logMiddleware,
    } = params;

    app
      .use(Middlewares.attachContext(this.#requestContext))
      .use(healthCheckRoute, healthCheckRouter)
      .use(logMiddleware)
      .use('*', Middlewares.handleMissedRoutes, Middlewares.errorHandler);
  }
}

/**********************************************************************************/

export default HttpServer;
