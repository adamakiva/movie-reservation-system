import type { Response } from 'express';

import type { Database } from '../database/index.js';
import type {
  AuthenticationManager,
  FileManager,
} from '../server/services/index.js';

import EnvironmentManager from './config.js';
import { ERROR_CODES, HTTP_STATUS_CODES } from './constants.js';
import { GeneralError, UnauthorizedError } from './errors.js';
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
type DatabaseModel<
  T extends keyof ReturnType<RequestContext['database']['getModels']>,
> = ReturnType<RequestContext['database']['getModels']>[T];

/********************************** Service ***************************************/

type Pagination = {
  hasNext: boolean;
  cursor: string | null;
};

type PaginatedResult<T = unknown> = T & { page: Pagination };

/**********************************************************************************/

export {
  ERROR_CODES,
  EnvironmentManager,
  GeneralError,
  HTTP_STATUS_CODES,
  Logger,
  UnauthorizedError,
  decodeCursor,
  encodeCursor,
  randomAlphaNumericString,
  strcasecmp,
  type DatabaseHandler,
  type DatabaseModel,
  type LogMiddleware,
  type LoggerHandler,
  type PaginatedResult,
  type RequestContext,
  type ResponseWithContext,
  type ResponseWithoutContext,
};
