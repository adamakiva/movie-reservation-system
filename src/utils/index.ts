import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import argon2 from 'argon2';
import compress from 'compression';
import cors, { type CorsOptions } from 'cors';
import {
  and,
  asc,
  count,
  eq,
  gt,
  or,
  sql,
  type Logger as DrizzleLogger,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import express, {
  Router,
  json,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import * as jose from 'jose';
import pg from 'postgres';
import Zod from 'zod';

import type { Database } from '../database/index.js';
import type { AuthenticationManager } from '../server/index.js';

import EnvironmentManager, { type Mode } from './config.js';
import { CONFIGURATIONS, ERROR_CODES, HTTP_STATUS_CODES } from './constants.js';
import MRSError from './error.js';
import {
  decodeCursor,
  encodeCursor,
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  strcasecmp,
} from './functions.js';
import Logger, { type LogMiddleware, type LoggerHandler } from './logger.js';

/********************************* General ****************************************/

type RemoveUndefinedFields<T, K extends keyof T> = {
  [P in keyof T]: P extends K ? Exclude<T[P], undefined> : T[P];
};

/********************************** Http ******************************************/

type ResponseWithoutCtx = Response<unknown, object>;
type ResponseWithCtx = Response<unknown, { context: RequestContext }>;

type RequestContext = {
  authentication: AuthenticationManager;
  database: Database;
  logger: ReturnType<Logger['getHandler']>;
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

type PaginatedResult<T> = T & { page: Pagination };

/**********************************************************************************/

export {
  CONFIGURATIONS,
  ERROR_CODES,
  EnvironmentManager,
  HTTP_STATUS_CODES,
  Logger,
  MRSError,
  Router,
  Zod,
  and,
  argon2,
  asc,
  compress,
  cors,
  count,
  createServer,
  decodeCursor,
  drizzle,
  encodeCursor,
  eq,
  express,
  gt,
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  jose,
  json,
  or,
  pg,
  readFile,
  resolve,
  sql,
  strcasecmp,
  type AddressInfo,
  type CorsOptions,
  type DatabaseHandler,
  type DrizzleLogger,
  type Express,
  type LogMiddleware,
  type LoggerHandler,
  type Mode,
  type NextFunction,
  type PaginatedResult,
  type RemoveUndefinedFields,
  type Request,
  type RequestContext,
  type Response,
  type ResponseWithCtx,
  type ResponseWithoutCtx,
  type Server,
};
