const CONFIGURATIONS = {
  POSTGRES: {
    POOL_MAX_CONNECTIONS: 64,
    STATEMENT_TIMEOUT: 30_000,
    IDLE_IN_TRANSACTION_SESSION_TIMEOUT: 60_000,
  },
} as const;

const HTTP_STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  MOVED_PERMANENTLY: 301,
  REDIRECT: 304,
  TEMPORARY_REDIRECT: 307,
  PERMANENT_REDIRECT: 308,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_ALLOWED: 405,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  CONTENT_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  GATEWAY_TIMEOUT: 504,
} as const;

const ERROR_CODES = {
  // See: https://www.postgresql.org/docs/current/errcodes-appendix.html
  POSTGRES: {
    FOREIGN_KEY_VIOLATION: '23503',
    UNIQUE_VIOLATION: '23505',
    TOO_MANY_CONNECTIONS: '53300',
  },
  // Indicator to the deployment orchestration service to not attempt to restart
  // the service, since the error is a result of a programmer error, and therefore
  // the application should not restart by default
  EXIT_RESTART: 1,
  EXIT_NO_RESTART: 180,
} as const;

const ALPHA_NUMERIC = {
  CHARACTERS:
    'ABCDEABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  LENGTH: 67,
} as const;

const SIGNALS = [
  'SIGHUP',
  'SIGINT',
  'SIGQUIT',
  'SIGILL',
  'SIGTRAP',
  'SIGABRT',
  'SIGBUS',
  'SIGFPE',
  'SIGSEGV',
  'SIGUSR2',
  'SIGTERM',
] as const;

/**********************************************************************************/

export {
  ALPHA_NUMERIC,
  CONFIGURATIONS,
  ERROR_CODES,
  HTTP_STATUS_CODES,
  SIGNALS,
};
