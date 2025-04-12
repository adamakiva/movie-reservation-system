import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import zod, {
  ZodIssueCode,
  type RefinementCtx,
  type SafeParseReturnType,
} from 'zod';

import { GeneralError } from '../utils/index.ts';

/**********************************************************************************/

const VALIDATION = {
  BODY: {
    INVALID_TYPE_ERROR_MESSAGE: 'Request body should be an object',
    REQUIRED_ERROR_MESSAGE: 'Request must have a body',
  },
  PARAMS: {
    INVALID_TYPE_ERROR_MESSAGE: 'Request params should be an object',
    REQUIRED_ERROR_MESSAGE: 'Request must have params',
  },
  QUERY: {
    INVALID_TYPE_ERROR_MESSAGE: 'Request query should be an object',
    REQUIRED_ERROR_MESSAGE: 'Request must have query params',
  },
  PAGINATION: {
    CURSOR: {
      INVALID_TYPE_ERROR_MESSAGE: 'Cursor must be a string',
      ERROR_MESSAGE: 'Invalid cursor',
      MIN_LENGTH: {
        VALUE: 1,
        ERROR_MESSAGE: 'Cursor must be at least 1 character long',
      },
      MAX_LENGTH: {
        VALUE: 128,
        ERROR_MESSAGE: 'Cursor must be at most 128 characters long',
      },
    },
    PAGE_SIZE: {
      INVALID_TYPE_ERROR_MESSAGE: 'Page size must be a number',
      DEFAULT_VALUE: 10,
      MIN_LENGTH: {
        VALUE: 1,
        ERROR_MESSAGE: 'Page size must be at least 1 character long',
      },
      MAX_LENGTH: {
        VALUE: 64,
        ERROR_MESSAGE: 'Page size must be at most 64 characters long',
      },
    },
  },
} as const;

const { PAGINATION } = VALIDATION;

/**********************************************************************************/

function parseValidationResult<I, O>(
  res: SafeParseReturnType<I, O>,
  statusCode: number = HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
) {
  if (res.success) {
    return res.data;
  }

  const errorMessages = res.error.errors
    .map((err) => {
      return err.message;
    })
    .join(', ');

  throw new GeneralError(statusCode, errorMessages, res.error.cause);
}

function coerceNumber(
  invalidTypeErrorMessage: string,
  missingErrorMessage?: string,
) {
  return (arg: unknown, context: RefinementCtx) => {
    const number = Number(arg);
    if (missingErrorMessage && (arg === undefined || arg === null)) {
      context.addIssue({
        code: ZodIssueCode.custom,
        message: missingErrorMessage,
        fatal: true,
      });

      return zod.NEVER;
    } else if (arg === '' || isNaN(number)) {
      context.addIssue({
        code: ZodIssueCode.custom,
        message: invalidTypeErrorMessage,
        fatal: true,
      });

      return zod.NEVER;
    }

    return number;
  };
}

function encodeCursor(id: string, createdAt: Date) {
  return Buffer.from(`${id},${createdAt.toISOString()}`).toString('base64');
}

function decodeCursor(cursor: string) {
  const decodedCursor = Buffer.from(cursor, 'base64')
    .toString('utf-8')
    .split(',');

  return {
    id: decodedCursor[0]!,
    createdAt: new Date(decodedCursor[1]!),
  } as const;
}

/****************************** Schemas *******************************************/

const CURSOR_SCHEMA = zod.object({
  id: zod
    .string({
      invalid_type_error: PAGINATION.CURSOR.ERROR_MESSAGE,
    })
    .uuid(PAGINATION.CURSOR.ERROR_MESSAGE),
  createdAt: zod.date({
    invalid_type_error: PAGINATION.CURSOR.ERROR_MESSAGE,
  }),
});

/**********************************************************************************/

export {
  coerceNumber,
  CURSOR_SCHEMA,
  decodeCursor,
  encodeCursor,
  parseValidationResult,
  VALIDATION,
};
