import type { Response } from 'express';
import type { Database } from '../database/index.js';
import type {
  AuthenticationManager,
  FileManager,
} from '../server/services/index.js';

import EnvironmentManager from './config.js';
import {
  ALPHA_NUMERIC,
  CONFIGURATIONS,
  ERROR_CODES,
  HTTP_STATUS_CODES,
  SIGNALS,
} from './constants.js';
import MRSError from './error.js';
import {
  decodeCursor,
  encodeCursor,
  randomAlphaNumericString,
  strcasecmp,
} from './functions.js';
import Logger, { type LogMiddleware, type LoggerHandler } from './logger.js';

/********************************** Http ******************************************/

type ResponseWithoutContext<E = unknown> = Response<E, object>;
type ResponseWithContext<E = unknown> = Response<
  E,
  { context: RequestContext }
>;

type RequestContext = {
  authentication: AuthenticationManager;
  database: Database;
  fileManager: FileManager;
  logger: LoggerHandler;
};

/********************************* Database ***************************************/

// Omitting client to allow this type to refer to transaction as well as the base
// database handler
type DatabaseHandler = Omit<
  ReturnType<RequestContext['database']['getHandler']>,
  '$client'
>;

/********************************** Service ***************************************/

type Pagination = {
  hasNext: boolean;
  cursor: string | null;
};

type PaginatedResult<T = unknown> = T & { page: Pagination };

type Credentials = {
  email: string;
  password: string;
};

/**********************************************************************************/

export {
  ALPHA_NUMERIC,
  CONFIGURATIONS,
  ERROR_CODES,
  EnvironmentManager,
  HTTP_STATUS_CODES,
  Logger,
  MRSError,
  SIGNALS,
  decodeCursor,
  encodeCursor,
  randomAlphaNumericString,
  strcasecmp,
  type Credentials,
  type DatabaseHandler,
  type LogMiddleware,
  type LoggerHandler,
  type PaginatedResult,
  type RequestContext,
  type ResponseWithContext,
  type ResponseWithoutContext,
};
