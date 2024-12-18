import { randomBytes as randomBytesSync } from 'node:crypto';
import { createReadStream, createWriteStream, type PathLike } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, resolve } from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';

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
import * as fileType from 'file-type';
import * as jose from 'jose';
import multer from 'multer';
import pg from 'postgres';
import Zod from 'zod';

import type { Database } from '../database/index.js';
import type {
  AuthenticationManager,
  FileManager,
} from '../server/services/index.js';

import EnvironmentManager, { type Mode } from './config.js';
import { CONFIGURATIONS, ERROR_CODES, HTTP_STATUS_CODES } from './constants.js';
import MRSError from './error.js';
import {
  decodeCursor,
  emptyFunction,
  encodeCursor,
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  strcasecmp,
} from './functions.js';
import Logger, { type LogMiddleware, type LoggerHandler } from './logger.js';

/**********************************************************************************/

const randomBytes = promisify(randomBytesSync);

/********************************* General ****************************************/

type RemoveUndefinedFields<T, K extends keyof T> = {
  [P in keyof T]: P extends K ? Exclude<T[P], undefined> : T[P];
};

/********************************** Http ******************************************/

type ResponseWithoutContext = Response<unknown, object>;
type ResponseWithContext = Response<unknown, { context: RequestContext }>;

type RequestContext = {
  authentication: AuthenticationManager;
  database: Database;
  fileManager: FileManager;
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

type Credentials = {
  email: string;
  password: string;
};

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
  createReadStream,
  createServer,
  createWriteStream,
  decodeCursor,
  drizzle,
  emptyFunction,
  encodeCursor,
  eq,
  express,
  extname,
  fileType,
  gt,
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  join,
  jose,
  json,
  multer,
  or,
  pg,
  pipeline,
  randomBytes,
  readFile,
  resolve,
  sql,
  strcasecmp,
  unlink,
  type AddressInfo,
  type CorsOptions,
  type Credentials,
  type DatabaseHandler,
  type DrizzleLogger,
  type Express,
  type LogMiddleware,
  type LoggerHandler,
  type Mode,
  type NextFunction,
  type PaginatedResult,
  type PathLike,
  type Readable,
  type RemoveUndefinedFields,
  type Request,
  type RequestContext,
  type Response,
  type ResponseWithContext,
  type ResponseWithoutContext,
  type Server,
  type Writable,
};
