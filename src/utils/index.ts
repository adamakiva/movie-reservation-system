import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import argon2 from 'argon2';
import compress from 'compression';
import { eq, sql, type Logger as DrizzleLogger } from 'drizzle-orm';
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

import type { Database } from '../db/index.js';
import type { AuthenticationManager } from '../server/index.js';

import EnvironmentManager, { type Mode } from './config.js';
import { CONFIGURATIONS, ERROR_CODES, HTTP_STATUS_CODES } from './constants.js';
import MRSError from './error.js';
import {
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  strcasecmp,
} from './functions.js';
import Logger, { type LogMiddleware, type LoggerHandler } from './logger.js';

/**********************************************************************************/

type ResponseWithoutCtx = Response<unknown, object>;
type ResponseWithCtx = Response<unknown, { context: RequestContext }>;

type RequestContext = {
  authentication: AuthenticationManager;
  database: Database;
  hashSecret: Buffer;
  logger: ReturnType<Logger['getHandler']>;
};

// Omitting client to allow this type to refer to transaction as well as the base
// database handler
type DatabaseHandler = Omit<
  ReturnType<RequestContext['database']['getHandler']>,
  '$client'
>;

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
  argon2,
  compress,
  createServer,
  drizzle,
  eq,
  express,
  isDevelopmentMode,
  isProductionMode,
  isTestMode,
  jose,
  json,
  pg,
  readFile,
  resolve,
  sql,
  strcasecmp,
  type AddressInfo,
  type DatabaseHandler,
  type DrizzleLogger,
  type Express,
  type LogMiddleware,
  type LoggerHandler,
  type Mode,
  type NextFunction,
  type Request,
  type RequestContext,
  type Response,
  type ResponseWithCtx,
  type ResponseWithoutCtx,
  type Server,
};
