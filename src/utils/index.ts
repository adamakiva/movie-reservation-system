import type { Response as ExpressResponse } from 'express';

import type { Database } from '../db/index.js';

import EnvironmentManager, { type Mode } from './config.js';
import { ERROR_CODES, HTTP_STATUS_CODES, VALIDATION } from './constants.js';
import MRSError from './error.js';
import {
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  strcasecmp,
} from './functions.js';
import Logger, { type LogMiddleware, type LoggerHandler } from './logger.js';

/**********************************************************************************/

type ResponseWithoutCtx = ExpressResponse<unknown, object>;
type ResponseWithCtx = ExpressResponse<unknown, { context: RequestContext }>;

type RequestContext = {
  db: Database;
  logger: ReturnType<Logger['getHandler']>;
};

// Omitting client to allow this type to refer to transaction as well as the base
// database handler
type DatabaseHandler = Omit<
  ReturnType<RequestContext['db']['getHandler']>,
  '$client'
>;

/**********************************************************************************/

export {
  ERROR_CODES,
  EnvironmentManager,
  HTTP_STATUS_CODES,
  Logger,
  MRSError,
  VALIDATION,
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  strcasecmp,
  type DatabaseHandler,
  type LogMiddleware,
  type LoggerHandler,
  type Mode,
  type RequestContext,
  type ResponseWithCtx,
  type ResponseWithoutCtx,
};
