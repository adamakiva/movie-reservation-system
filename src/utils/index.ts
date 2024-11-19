import type { Response as ExpressResponse } from 'express';

import Database from '../db/index.js';

import EnvironmentManager from './config.js';
import { ERROR_CODES, HTTP_STATUS_CODES, VALIDATION } from './constants.js';
import MRSError from './error.js';
import {
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  strcasecmp,
} from './functions.js';
import Logger from './logger.js';

/**********************************************************************************/

type ResponseWithoutCtx = ExpressResponse<unknown, {}>;
type ResponseWithCtx = ExpressResponse<unknown, { context: RequestContext }>;

type RequestContext = {
  db: Database;
  logger: ReturnType<Logger['getHandler']>;
};

/**********************************************************************************/

export {
  EnvironmentManager,
  ERROR_CODES,
  HTTP_STATUS_CODES,
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  Logger,
  MRSError,
  strcasecmp,
  VALIDATION,
  type RequestContext,
  type ResponseWithCtx,
  type ResponseWithoutCtx,
};
