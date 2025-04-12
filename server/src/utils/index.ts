import type { Response } from 'express';

import type { Database } from '../database/index.ts';
import type {
  AuthenticationManager,
  FileManager,
  MessageQueue,
} from '../server/services/index.ts';

import EnvironmentManager from './config.ts';
import { GeneralError, UnauthorizedError } from './errors.ts';
import { Logger, type LogMiddleware, type LoggerHandler } from './logger.ts';

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
  messageQueue: MessageQueue;
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
  EnvironmentManager,
  GeneralError,
  Logger,
  UnauthorizedError,
  type DatabaseHandler,
  type DatabaseModel,
  type LogMiddleware,
  type LoggerHandler,
  type PaginatedResult,
  type RequestContext,
  type ResponseWithContext,
  type ResponseWithoutContext,
};
