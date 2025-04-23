import type { Response } from 'express';

import type { Database } from '../database/index.ts';
import type {
  AuthenticationManager,
  FileManager,
  MessageQueue,
} from '../server/services/index.ts';

import type { Logger, LogMiddleware } from './logger.ts';

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
  logger: Logger;
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

export type {
  DatabaseHandler,
  DatabaseModel,
  LogMiddleware,
  PaginatedResult,
  RequestContext,
  ResponseWithContext,
  ResponseWithoutContext,
};
