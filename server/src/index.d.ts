/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import type { MessageQueue } from '@adamakiva/movie-reservation-system-message-queue';

import type { Database } from './database/index.ts';
import type {
  AuthenticationManager,
  FileManager,
} from './server/services/index.ts';

import type { Logger } from './utils/logger.ts';

/**********************************************************************************/

// Decleration merging, see: https://www.typescriptlang.org/docs/handbook/declaration-merging.html
declare global {
  namespace Express {
    interface Locals {
      authentication: AuthenticationManager;
      database: Database;
      fileManager: FileManager;
      messageQueue: MessageQueue;
      logger: Logger;
    }
  }
}
