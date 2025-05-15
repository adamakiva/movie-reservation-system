import { Buffer } from 'node:buffer';
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
  readonly #isAliveHandler;

  readonly #boundErrorEventHandler;
  readonly #boundPongEventHandler;

  #counter;
  #isAlive;

  public constructor(params: {
    websocket: WebSocket;
    pingTime: number;
    logger: Logger;
  }) {
    const { websocket, pingTime, logger } = params;

    this.#counter = 0;
    this.#isAlive = true;

    this.#boundErrorEventHandler = this.#errorEventHandler.bind(this);
    this.#boundPongEventHandler = this.#pongEventHandler.bind(this);

    this.#handler = websocket
      .on('error', this.#boundErrorEventHandler)
      .on('pong', this.#boundPongEventHandler);
    this.#logger = logger;

    this.#isAliveHandler = setInterval(() => {
      ++this.#counter;
      this.ping();
      if (this.#counter > 3) {
        this.#isAlive = false;
      }
    }, pingTime);
  }

  public isAlive() {
    return this.#isAlive;
  }

  public state() {
    return this.#handler.readyState;
  }

  public ping(...parameters: Parameters<WebSocket['ping']>) {
    this.#handler.ping(...parameters);
  }

  public send(...parameters: Parameters<WebSocket['send']>) {
    this.#handler.send(...parameters);
  }

  public close() {
    clearInterval(this.#isAliveHandler);
    this.#handler
      .removeListener('error', this.#boundErrorEventHandler)
      .removeListener('pong', this.#boundPongEventHandler)
      .terminate();
  }

  /********************************************************************************/

  #errorEventHandler(error: Error) {
    this.#logger.error('Unexpected websocket error:', error);
  }

  #pongEventHandler() {
    if (this.#counter) {
      --this.#counter;
    }
  }
}

/**********************************************************************************/
/**********************************************************************************/

class WebsocketServer {
  readonly #handler;
  readonly #pingTime;
  readonly #clients;
  readonly #isAliveHandler;
  readonly #httpServer;
  readonly #authentication;
  readonly #logger;

  readonly #boundWebsocketServerErrorEventHandler;
  readonly #boundWebsocketClientErrorEventHandler;
  readonly #boundConnectionEventHandler;
  readonly #boundUpgradeEventHandler;

  public constructor(params: {
    server: Server;
    authentication: AuthenticationManager;
    path: string;
    pingTime: number;
    options?: WebSocket.ServerOptions;
    backlog?: number | undefined;
    maxPayload?: number | undefined; // In bytes
    logger: Logger;
  }) {
    const { server, authentication, pingTime, options, logger } = params;

    // Fix the websocket path if needed
    if (!params.path.startsWith('/')) {
      params.path = `/${params.path}`;
    }

    this.#boundWebsocketServerErrorEventHandler =
      this.#websocketServerErrorEventHandler.bind(this);
    this.#boundWebsocketClientErrorEventHandler =
      this.#websocketClientErrorEventHandler.bind(this);
    this.#boundConnectionEventHandler = this.#connectionEventHandler.bind(this);
    this.#boundUpgradeEventHandler = this.#upgradeEventHandler.bind(this);

    this.#handler = new WebSocketServer<
      typeof WebSocket,
      typeof IncomingMessage
    >({ ...options, noServer: true })
      .on('error', this.#boundWebsocketServerErrorEventHandler)
      .on('wsClientError', this.#boundWebsocketClientErrorEventHandler)
      .on('connection', this.#boundConnectionEventHandler);
    this.#pingTime = pingTime;
    this.#httpServer = server;
    this.#authentication = authentication;
    this.#logger = logger;

    this.#httpServer.on('upgrade', this.#boundUpgradeEventHandler);

    // Every client may be connected from more than one device
    this.#clients = new Map<string, Websocket[]>();

    this.#isAliveHandler = setInterval(() => {
      this.#clients.forEach((websockets, email) => {
        for (let i = websockets.length - 1; i >= 0; --i) {
          const websocket = websockets[i]!;

          if (!websocket.isAlive()) {
            websocket.close();
            websockets.splice(i, 1);
            if (!websockets.length) {
              this.#clients.delete(email);
            }
          }
        }
      });
    }, 30_000);
  }

  public sendMessage(
    userId: string,
    ...parameters: Parameters<WebSocket['send']>
  ) {
    const websockets = this.#clients.get(userId);

    websockets?.forEach((websocket) => {
      if (websocket.isAlive() && websocket.state() === WebSocket.OPEN) {
        websocket.send(...parameters);
      }
    });
  }

  public broadcast(...parameters: Parameters<WebSocket['send']>) {
    this.#clients.forEach((websockets) => {
      websockets.forEach((websocket) => {
        if (websocket.isAlive() && websocket.state() === WebSocket.OPEN) {
          websocket.send(...parameters);
        }
      });
    });
  }

  public close() {
    // Websockets
    this.#clients.forEach((websockets) => {
      websockets.forEach((websocket) => {
        websocket.close();
      });
    });
    this.#clients.clear();

    clearInterval(this.#isAliveHandler);

    // Websocket server
    this.#handler
      .removeListener('error', this.#boundWebsocketServerErrorEventHandler)
      .removeListener(
        'wsClientError',
        this.#boundWebsocketClientErrorEventHandler,
      )
      .removeListener('connection', this.#boundConnectionEventHandler)
      .close();

    // Http server
    this.#httpServer.removeListener('upgrade', this.#upgradeEventHandler);
  }

  /********************************************************************************/

  #parseAuthenticationHeader(request: IncomingMessage) {
    // Can be asserted since the request is an http request. See: https://nodejs.org/api/http.html#messageurl
    const { query } = parse(request.url!, true);
    let authorizationToken = Array.isArray(query.auth_token)
      ? query.auth_token[0]
      : query.auth_token;

    if (!authorizationToken) {
      throw new UnauthorizedError('missing');
    }
    authorizationToken = Buffer.from(authorizationToken, 'base64').toString();

    return authorizationToken.replace('Bearer', '');
  }

  #websocketServerErrorEventHandler(error: Error) {
    this.#logger.error('Unexpected websocket server error:', error);
  }

  #websocketClientErrorEventHandler(error: Error, socket: Socket) {
    this.#logger.error('Unexpected web socket error:', error);
    socket.destroy();
  }

  async #upgradeEventHandler(
    request: IncomingMessage,
    socket: Socket,
    head: Buffer,
  ) {
    socket.once('error', (error) => {
      this.#logger.error('Socket error:', error);
      socket.write(
        `HTTP/1.1 ${HTTP_STATUS_CODES.UNAUTHORIZED}\r\n\r\n`,
        (error) => {
          if (error) {
            this.#logger.error('Writing socket message failed:', error);
          }
          socket.destroy();
        },
      );
    });

    // The authentication token is expected in the query string of the websocket
    // as a base64 encoded bearer token (With or without the `Bearer` keyword)
    const authenticationHeader = this.#parseAuthenticationHeader(request);
    await this.#authentication.verifyWebsocketAuthentication(
      authenticationHeader,
    );
    this.#handler.handleUpgrade(request, socket, head, (websocket, request) => {
      this.#handler.emit('connection', websocket, request);
    });
  }

  #connectionEventHandler(websocket: WebSocket, request: IncomingMessage) {
    // At this stage, the token exists and is authenticated
    const userId = this.#authentication.getUserId(
      this.#parseAuthenticationHeader(request),
    );
    const handler = new Websocket({
      websocket,
      pingTime: this.#pingTime,
      logger: this.#logger,
    });

    const websockets = this.#clients.get(userId);
    if (!websockets) {
      this.#clients.set(userId, [handler]);
    } else {
      websockets.push(handler);
    }
  }
}

/**********************************************************************************/

export { WebsocketServer };
