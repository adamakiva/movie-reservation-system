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

declare const CORRELATION_IDS: {
  TICKET_RESERVATION: "ticket.reserve";
  TICKET_CANCELLATION: "ticket.cancel";
  SHOWTIME_CANCELLATION: "showtime.cancel";
};

/**********************************************************************************/

type Exchanges = ["mrs"];
type Consumers = ["ticket", "showtime"];
type Publishers = ["ticket", "showtime"];

type Queues = {
  ticket: [
    "mrs.ticket.reserve",
    "mrs.ticket.cancel",
    "mrs.ticket.reserve.reply.to",
    "mrs.ticket.cancel.reply.to"
  ];
  showtime: ["mrs.showtime.cancel", "mrs.showtime.cancel.reply.to"];
};
type RoutingKeys = {
  ticket: [
    "mrs-ticket-reserve",
    "mrs-ticket-cancel",
    "mrs-ticket-reserve-reply-to",
    "mrs-ticket-cancel-reply-to"
  ];
  showtime: ["mrs-showtime-cancel", "mrs-showtime-cancel-reply-to"];
};

type TicketReservationsMessage = {
  showtimeId: string;
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
type TicketCancellationMessage = {
  showtimeId: string;
  userIds: string | string[];
};
type ShowtimeCancellationMessage = {
  showtimeId: string;
  userIds: string[];
};

type TicketReservationWebsocketMessage = {
  action: "reserve";
  showtimeId: string;
  row: number;
  column: number;
};
type TicketCancellationWebsocketMessages = {
  action: "cancel";
  showtimeId: string;
  rows: number[];
  columns: number[];
};

/**********************************************************************************/

export {
  CORRELATION_IDS,
  ERROR_CODES,
  HTTP_STATUS_CODES,
  SIGNALS,
  type Consumers,
  type Exchanges,
  type Publishers,
  type Queues,
  type RoutingKeys,
  type ShowtimeCancellationMessage,
  type TicketCancellationMessage,
  type TicketCancellationWebsocketMessages,
  type TicketReservationsMessage,
  type TicketReservationWebsocketMessage,
};
