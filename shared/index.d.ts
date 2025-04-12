declare const HTTP_STATUS_CODES: {
  SUCCESS: 200;
  CREATED: 201;
  ACCEPTED: 202;
  NO_CONTENT: 204;
  MOVED_PERMANENTLY: 301;
  FOUND: 302;
  REDIRECT: 304;
  TEMPORARY_REDIRECT: 307;
  PERMANENT_REDIRECT: 308;
  BAD_REQUEST: 400;
  UNAUTHORIZED: 401;
  FORBIDDEN: 403;
  NOT_FOUND: 404;
  NOT_ALLOWED: 405;
  REQUEST_TIMEOUT: 408;
  CONFLICT: 409;
  CONTENT_TOO_LARGE: 413;
  UNPROCESSABLE_ENTITY: 422;
  TOO_MANY_REQUESTS: 429;
  SERVER_ERROR: 500;
  BAD_GATEWAY: 502;
  GATEWAY_TIMEOUT: 504;
};

declare const SIGNALS: [
  "SIGHUP",
  "SIGINT",
  "SIGQUIT",
  "SIGILL",
  "SIGTRAP",
  "SIGABRT",
  "SIGBUS",
  "SIGFPE",
  "SIGSEGV",
  "SIGUSR2",
  "SIGTERM"
];

declare const ERROR_CODES: {
  // See: https://www.postgresql.org/docs/current/errcodes-appendix.html
  POSTGRES: {
    FOREIGN_KEY_VIOLATION: "23503";
    UNIQUE_VIOLATION: "23505";
    TOO_MANY_CONNECTIONS: "53300";
  };
  // Indicator to the deployment orchestration service to not attempt to restart
  // the service, since the error is a result of a programmer error, and therefore
  // the application should not restart by default
  EXIT_RESTART: 1;
  EXIT_NO_RESTART: 180;
};

declare const MESSAGE_QUEUE: {
  TICKET: {
    RESERVE: {
      CLIENT: {
        EXCHANGE_NAME: "mrs";
        QUEUE_NAME: "mrs.ticket.reserve.reply.to";
        ROUTING_KEY_NAME: "mrs-ticket-reserve-reply-to";
      };
      SERVER: {
        EXCHANGE_NAME: "mrs";
        QUEUE_NAME: "mrs.ticket.reserve";
        ROUTING_KEY_NAME: "mrs-ticket-reserve";
      };
      CORRELATION_ID: "reserve";
    };
    CANCEL: {
      CLIENT: {
        EXCHANGE_NAME: "mrs";
        QUEUE_NAME: "mrs.ticket.cancel.reply.to";
        ROUTING_KEY_NAME: "mrs-ticket-cancel-reply-to";
      };
      SERVER: {
        EXCHANGE_NAME: "mrs";
        QUEUE_NAME: "mrs.ticket.cancel";
        ROUTING_KEY_NAME: "mrs-ticket-cancel";
      };
      CORRELATION_ID: "cancel";
    };
  };
};

/**********************************************************************************/

type Exchanges = ["mrs"];
type Consumers = ["ticket"];
type Publishers = ["ticket"];

type ServerPublishersQueues = {
  [K in Exchanges[number]]: [
    `${K}.${Publishers[0]}.reserve`,
    `${K}.${Publishers[0]}.cancel`
  ];
};
type ServerPublishersRoutingKeys = {
  [K in Exchanges[number]]: [
    `${K}-${Publishers[0]}-reserve`,
    `${K}-${Publishers[0]}-cancel`
  ];
};
type ServerConsumersQueues = {
  [K in Exchanges[number]]: [
    `${K}.${Consumers[0]}.reserve.reply.to`,
    `${K}.${Consumers[0]}.cancel.reply.to`
  ];
};
type ServerConsumersRoutingKeys = {
  [K in Exchanges[number]]: [
    `${K}-${Consumers[0]}-reserve-reply-to`,
    `${K}-${Consumers[0]}-cancel-reply-to`
  ];
};
type WorkerPublishersQueues = {
  [K in Exchanges[number]]: [
    `${K}.${Consumers[0]}.reserve.reply.to`,
    `${K}.${Consumers[0]}.cancel.reply.to`
  ];
};
type WorkerPublishersRoutingKeys = {
  [K in Exchanges[number]]: [
    `${K}-${Consumers[0]}-reserve-reply-to`,
    `${K}-${Consumers[0]}-cancel-reply-to`
  ];
};
type WorkerConsumersQueues = {
  [K in Exchanges[number]]: [
    `${K}.${Publishers[0]}.reserve`,
    `${K}.${Publishers[0]}.cancel`
  ];
};
type WorkerConsumersRoutingKeys = {
  [K in Exchanges[number]]: [
    `${K}-${Publishers[0]}-reserve`,
    `${K}-${Publishers[0]}-cancel`
  ];
};

type TicketReservationsParams = {
  userShowtimeId: string;
  userDetails: { id: string; email: string };
  movieDetails: {
    hallName: string;
    movieTitle: string;
    price: number;
    at: Date;
    row: number;
    column: number;
  };
};
type TicketCancellationParams = {
  showtimeId: string;
  userIds: string | string[];
};

/**********************************************************************************/

export {
  ERROR_CODES,
  HTTP_STATUS_CODES,
  MESSAGE_QUEUE,
  SIGNALS,
  type Consumers,
  type Exchanges,
  type Publishers,
  type ServerConsumersQueues,
  type ServerConsumersRoutingKeys,
  type ServerPublishersQueues,
  type ServerPublishersRoutingKeys,
  type TicketCancellationParams,
  type TicketReservationsParams,
  type WorkerConsumersQueues,
  type WorkerConsumersRoutingKeys,
  type WorkerPublishersQueues,
  type WorkerPublishersRoutingKeys,
};
