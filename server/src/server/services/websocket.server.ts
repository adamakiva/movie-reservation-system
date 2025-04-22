/* eslint-disable max-classes-per-file */

import type { IncomingMessage, Server } from 'node:http';
import type { Socket } from 'node:net';
import { parse } from 'node:url';

import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { WebSocket, WebSocketServer } from 'ws';

import { UnauthorizedError } from '../../utils/errors.ts';
import type { Logger } from '../../utils/logger.ts';
import type { AuthenticationManager } from './authentication.ts';

/**********************************************************************************/

class Websocket {
  readonly #handler;
  readonly #logger;

  public readonly id;
  public isAlive;

  public constructor(params: { ws: WebSocket; id: string; logger: Logger }) {
    const { ws, id, logger } = params;

    this.#handler = ws;
    this.id = id;
    this.#logger = logger;

    this.#handler
      .on('error', this.#errorEventHandler)
      .on('pong', this.#pongEventHandler);

    this.isAlive = true;
  }

  public state() {
    return this.#handler.readyState;
  }

  public ping(...parameters: Parameters<WebSocket['ping']>) {
    this.#handler.ping(...parameters);
  }

  public sendMessage(...parameters: Parameters<WebSocket['send']>) {
    this.#handler.send(...parameters);
  }

  public close() {
    this.#handler.terminate();
    this.#handler
      .removeListener('pong', this.#pongEventHandler)
      .removeListener('error', this.#errorEventHandler);
  }

  /********************************************************************************/

  readonly #errorEventHandler = (err: Error) => {
    this.#logger.error('Unexpected websocket error:', err);
  };

  readonly #pongEventHandler = () => {
    this.isAlive = true;
  };
}

/**********************************************************************************/
/**********************************************************************************/

class WebsocketServer {
  readonly #handler;
  readonly #httpServer;
  readonly #authentication;
  readonly #logger;

  readonly #clients;

  readonly #timerHandler;

  public constructor(params: {
    server: Server;
    authentication: AuthenticationManager;
    path: string;
    pingTime?: number | undefined;
    backlog?: number | undefined;
    maxPayload?: number | undefined; // In bytes
    logger: Logger;
  }) {
    const {
      server,
      authentication,
      pingTime = 8_000,
      logger,
      ...options
    } = params;

    // Fix the websocket path if needed
    if (!options.path.startsWith('/', 0)) {
      options.path = `/${options.path}`;
    }

    this.#handler = new WebSocketServer<
      typeof WebSocket,
      typeof IncomingMessage
    >({ ...options, noServer: true })
      .on('error', this.#websocketServerErrorEventHandler)
      .on('wsClientError', this.#websocketErrorEventHandler)
      .on('connection', this.#connectionEventHandler);
    this.#httpServer = server;
    this.#authentication = authentication;
    this.#logger = logger;

    this.#httpServer.on('upgrade', this.#upgradeEventHandler);

    // Every client may be connected from more than one device
    this.#clients = new Map<string, Websocket[]>();

    this.#timerHandler = setInterval(() => {
      this.#clients.forEach((wss) => {
        for (let i = wss.length - 1; i >= 0; --i) {
          const ws = wss[i]!;

          if (!ws.isAlive) {
            ws.close();
            wss.splice(i, 1);
          }

          ws.isAlive = true;
          ws.ping();
        }
      });
    }, pingTime);
  }

  public sendMessage(
    userId: string,
    ...parameters: Parameters<WebSocket['send']>
  ) {
    const userWebsockets = this.#clients.get(userId);

    userWebsockets?.forEach((websocket) => {
      if (websocket.isAlive && websocket.state() === WebSocket.OPEN) {
        websocket.sendMessage(...parameters);
      }
    });
  }

  public broadcast(...parameters: Parameters<WebSocket['send']>) {
    this.#clients.forEach((websockets) => {
      websockets.forEach((websocket) => {
        if (websocket.isAlive && websocket.state() === WebSocket.OPEN) {
          websocket.sendMessage(...parameters);
        }
      });
    });
  }

  public close() {
    clearInterval(this.#timerHandler);

    this.#clients.forEach((wss) => {
      wss.forEach((ws) => {
        ws.close();
      });
    });
    this.#clients.clear();

    this.#handler.close();
    this.#handler
      .removeListener('connection', this.#connectionEventHandler)
      .removeListener('wsClientError', this.#websocketErrorEventHandler)
      .removeListener('error', this.#websocketServerErrorEventHandler);

    // Http server
    this.#httpServer.removeListener('upgrade', this.#upgradeEventHandler);
  }

  /********************************************************************************/

  #parseAuthenticationHeader(req: IncomingMessage) {
    // Can be asserted since the req is an http request. See: https://nodejs.org/api/http.html#messageurl
    const { query } = parse(req.url!, true);
    let authorizationToken = Array.isArray(query.auth_token)
      ? query.auth_token[0]
      : query.auth_token;

    if (!authorizationToken) {
      throw new UnauthorizedError('missing');
    }
    authorizationToken = Buffer.from(authorizationToken, 'base64').toString();

    return authorizationToken.replace('Bearer', '');
  }

  /********************************************************************************/

  readonly #websocketServerErrorEventHandler = (err: Error) => {
    this.#logger.error('Unexpected websocket server error:', err);
  };

  readonly #websocketErrorEventHandler = (err: Error, socket: Socket) => {
    this.#logger.error('Unexpected web socket error:', err);
    socket.destroy();
  };

  readonly #upgradeEventHandler = (
    req: IncomingMessage,
    socket: Socket,
    head: Buffer,
  ) => {
    socket.on('error', this.#socketErrorEventHandler);

    // The authentication token is expected in the query string of the websocket
    // as a base64 encoded bearer token (With or without the `Bearer` keyword)
    const authenticationHeader = this.#parseAuthenticationHeader(req);
    this.#authentication
      .verifyWebsocketAuthentication(authenticationHeader)
      .then(() => {
        this.#handler.handleUpgrade(req, socket, head, (ws, req) => {
          this.#handler.emit('connection', ws, req);
        });
      })
      .catch(() => {
        socket.write(
          `HTTP/1.1 ${HTTP_STATUS_CODES.UNAUTHORIZED}\r\n\r\n`,
          (err) => {
            if (err) {
              this.#logger.error(err);
            }
            socket.destroy();
          },
        );
      })
      .finally(() => {
        socket.removeListener('error', this.#socketErrorEventHandler);
      });
  };

  readonly #socketErrorEventHandler = (err: Error) => {
    this.#logger.error('Unexpected socket error:', err);
  };

  readonly #connectionEventHandler = (ws: WebSocket, req: IncomingMessage) => {
    // At this stage, the token exists and is authenticated
    const userId = this.#authentication.getUserId(
      this.#parseAuthenticationHeader(req),
    );
    const handler = new Websocket({ ws, id: userId, logger: this.#logger });

    const wss = this.#clients.get(userId);
    if (!wss) {
      this.#clients.set(userId, [handler]);
    } else {
      wss.push(handler);
    }
  };
}

/**********************************************************************************/

export { WebsocketServer };
