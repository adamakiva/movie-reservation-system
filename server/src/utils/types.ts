import type { Locals } from 'express';

/********************************* Database ***************************************/

// Omitting client to allow this type to refer to transaction as well as the base
// database handler
type DatabaseHandler = Omit<
  ReturnType<Locals['database']['getHandler']>,
  '$client'
>;
type DatabaseModel<
  T extends keyof ReturnType<Locals['database']['getModels']>,
> = ReturnType<Locals['database']['getModels']>[T];

/********************************** Service ***************************************/

type Pagination = {
  hasNext: boolean;
  cursor: string | null;
};

type PaginatedResult<T = unknown> = T & { page: Pagination };

/**********************************************************************************/

export type { DatabaseHandler, DatabaseModel, PaginatedResult, Pagination };
