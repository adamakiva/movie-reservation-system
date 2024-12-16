import { MRSError, Zod } from '../utils/index.js';

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
        ERROR_MESSAGE: 'Page size must be at most 128 characters long',
      },
    },
  },
  HEALTHCHECK: {
    HTTP_METHODS: {
      NAMES: ['HEAD', 'GET'],
      ERROR_MESSAGE: `HTTP method must be one of 'HEAD', 'GET'`,
      INVALID_TYPE_ERROR_MESSAGE: 'HTTP method must be a string',
      REQUIRED_ERROR_MESSAGE: 'HTTP method is required',
      MIN_LENGTH: {
        VALUE: 3,
        ERROR_MESSAGE: 'HTTP method must be at least 3 characters long',
      },
      MAX_LENGTH: {
        VALUE: 4,
        ERROR_MESSAGE: 'HTTP method must be at most 4 characters long',
      },
    },
  },
  AUTHENTICATION: {
    REFRESH: {
      TOKEN: {
        ERROR_MESSAGE: 'Invalid refresh token',
        INVALID_TYPE_ERROR_MESSAGE: 'Refresh token must be a string',
        REQUIRED_ERROR_MESSAGE: 'Refresh token is required',
      },
    },
  },
  ROLE: {
    NO_FIELDS_TO_UPDATE_ERROR_MESSAGE: 'Empty update is not allowed',
    ID: {
      INVALID_TYPE_ERROR_MESSAGE: 'Role id must be a string',
      REQUIRED_ERROR_MESSAGE: 'Role id is required',
      ERROR_MESSAGE: 'Role id must be a valid UUIDV4',
    },
    NAME: {
      INVALID_TYPE_ERROR_MESSAGE: 'Role name must be a string',
      REQUIRED_ERROR_MESSAGE: 'Role name is required',
      MIN_LENGTH: {
        VALUE: 1,
        ERROR_MESSAGE: 'Role name must be at least 1 character long',
      },
      MAX_LENGTH: {
        VALUE: 64,
        ERROR_MESSAGE: 'Role name must be at most 64 characters long',
      },
    },
  },
  USER: {
    NO_FIELDS_TO_UPDATE_ERROR_MESSAGE: 'Empty update is not allowed',
    ID: {
      INVALID_TYPE_ERROR_MESSAGE: 'User id must be a string',
      REQUIRED_ERROR_MESSAGE: 'User id is required',
      ERROR_MESSAGE: 'User id must be a valid UUIDV4',
    },
    FIRST_NAME: {
      INVALID_TYPE_ERROR_MESSAGE: 'First name must be a string',
      REQUIRED_ERROR_MESSAGE: 'First name is required',
      MIN_LENGTH: {
        VALUE: 2,
        ERROR_MESSAGE: 'First name must be at least 2 characters long',
      },
      MAX_LENGTH: {
        VALUE: 64,
        ERROR_MESSAGE: 'First name must be at most 64 characters long',
      },
    },
    LAST_NAME: {
      INVALID_TYPE_ERROR_MESSAGE: 'Last name must be a string',
      REQUIRED_ERROR_MESSAGE: 'Last name is required',
      MIN_LENGTH: {
        VALUE: 1,
        ERROR_MESSAGE: 'Last name must be at least 2 characters long',
      },
      MAX_LENGTH: {
        VALUE: 128,
        ERROR_MESSAGE: 'Last name must be at most 64 characters long',
      },
    },
    EMAIL: {
      ERROR_MESSAGE: 'Invalid email address',
      INVALID_TYPE_ERROR_MESSAGE: 'Email must be a string',
      REQUIRED_ERROR_MESSAGE: 'Email is required',
      MIN_LENGTH: {
        VALUE: 3,
        ERROR_MESSAGE: 'Email must be at least 3 characters long',
      },
      MAX_LENGTH: {
        VALUE: 256,
        ERROR_MESSAGE: 'Email must be at most 256 characters long',
      },
    },
    PASSWORD: {
      INVALID_TYPE_ERROR_MESSAGE: 'Password must be a string',
      REQUIRED_ERROR_MESSAGE: 'Password is required',
      MIN_LENGTH: {
        VALUE: 4,
        ERROR_MESSAGE: 'Password must be at least 4 characters long',
      },
      MAX_LENGTH: {
        VALUE: 64,
        ERROR_MESSAGE: 'Password must be at most 64 characters long',
      },
    },
    ROLE_ID: {
      INVALID_TYPE_ERROR_MESSAGE: 'Role id must be a string',
      REQUIRED_ERROR_MESSAGE: 'Role id is required',
      ERROR_MESSAGE: 'Role id must be a valid UUIDV4',
    },
  },
  GENRE: {
    NO_FIELDS_TO_UPDATE_ERROR_MESSAGE: 'Empty update is not allowed',
    ID: {
      INVALID_TYPE_ERROR_MESSAGE: 'Genre id must be a string',
      REQUIRED_ERROR_MESSAGE: 'Genre id is required',
      ERROR_MESSAGE: 'Genre id must be a valid UUIDV4',
    },
    NAME: {
      INVALID_TYPE_ERROR_MESSAGE: 'Genre name must be a string',
      REQUIRED_ERROR_MESSAGE: 'Genre name is required',
      MIN_LENGTH: {
        VALUE: 3,
        ERROR_MESSAGE: 'Genre name must be at least 3 character long',
      },
      MAX_LENGTH: {
        VALUE: 32,
        ERROR_MESSAGE: 'Genre name must be at most 32 characters long',
      },
    },
  },
  MOVIE: {
    NO_FIELDS_TO_UPDATE_ERROR_MESSAGE: 'Empty update is not allowed',
    ID: {
      INVALID_TYPE_ERROR_MESSAGE: 'Movie id must be a string',
      REQUIRED_ERROR_MESSAGE: 'Movie id is required',
      ERROR_MESSAGE: 'Movie id must be a valid UUIDV4',
    },
    TITLE: {
      INVALID_TYPE_ERROR_MESSAGE: 'Title must be a string',
      REQUIRED_ERROR_MESSAGE: 'Title is required',
      MIN_LENGTH: {
        VALUE: 1,
        ERROR_MESSAGE: 'Title must be at least 1 character long',
      },
      MAX_LENGTH: {
        VALUE: 128,
        ERROR_MESSAGE: 'Title must be at most 128 characters long',
      },
    },
    DESCRIPTION: {
      INVALID_TYPE_ERROR_MESSAGE: 'Description must be a string',
      REQUIRED_ERROR_MESSAGE: 'Description is required',
      MIN_LENGTH: {
        VALUE: 2,
        ERROR_MESSAGE: 'Description must be at least 2 characters long',
      },
      MAX_LENGTH: {
        VALUE: 2_048,
        ERROR_MESSAGE: 'Description must be at most 2,048 characters long',
      },
    },
    POSTER: {
      INVALID_TYPE_ERROR_MESSAGE: 'Poster must be a valid image',
      REQUIRED_ERROR_MESSAGE: 'Poster is required',
      FILE_NAME: {
        INVALID_TYPE_ERROR_MESSAGE: 'Poster file name be a valid image',
        REQUIRED_ERROR_MESSAGE: 'Poster file name is required',
        MIN_LENGTH: {
          VALUE: 1,
          ERROR_MESSAGE: 'Poster file name must be at least 1 character long',
        },
        MAX_LENGTH: {
          VALUE: 256,
          ERROR_MESSAGE: 'Poster file name must be at most 256 characters long',
        },
      },
      FILE_PATH: {
        INVALID_TYPE_ERROR_MESSAGE: 'Poster file path must be a valid image',
        REQUIRED_ERROR_MESSAGE: 'Poster file path is required',
        MIN_LENGTH: {
          VALUE: 3,
          ERROR_MESSAGE:
            'Poster file path name must be at least 3 characters long',
        },
        MAX_LENGTH: {
          VALUE: 512,
          ERROR_MESSAGE:
            'Poster file path name must be at most 256 characters long',
        },
      },
      FILE_SIZE: {
        INVALID_TYPE_ERROR_MESSAGE: 'Poster file size must be a valid number',
        REQUIRED_ERROR_MESSAGE: 'Poster file size is required',
        MIN_VALUE: {
          VALUE: 1, // In bytes
          ERROR_MESSAGE: 'Poster size is too small',
        },
        MAX_VALUE: {
          VALUE: 4_194_304, // In bytes
          ERROR_MESSAGE: 'Poster size is too large',
        },
      },
    },
    PRICE: {
      INVALID_TYPE_ERROR_MESSAGE: 'Price must be a number',
      REQUIRED_ERROR_MESSAGE: 'Price is required',
      MIN_VALUE: {
        VALUE: 0.01,
        ERROR_MESSAGE: 'Price must be at least 0.01$',
      },
      MAX_VALUE: {
        VALUE: 100.0,
        ERROR_MESSAGE: 'Price must be at most 100.0$',
      },
    },
    GENRE_ID: {
      INVALID_TYPE_ERROR_MESSAGE: 'Genre id must be a string',
      REQUIRED_ERROR_MESSAGE: 'Genre id is required',
      ERROR_MESSAGE: 'Genre id must be a valid UUIDV4',
    },
  },
} as const;

const { PAGINATION } = VALIDATION;

/**********************************************************************************/

function parseValidationResult<I, O>(
  res: Zod.SafeParseReturnType<I, O>,
  statusCode: number,
) {
  if (!res.success) {
    const errorMessages = res.error.errors
      .map((err) => {
        return err.message;
      })
      .join(', ');

    throw new MRSError(statusCode, errorMessages, res.error.cause);
  }

  return res.data;
}

// The cursor schema is checked with a programmer created object, so the
// error messages only exist for possible error paths
const cursorSchema = Zod.object({
  id: Zod.string({
    invalid_type_error: PAGINATION.CURSOR.ERROR_MESSAGE,
  }).uuid(PAGINATION.CURSOR.ERROR_MESSAGE),
  createdAt: Zod.date({
    invalid_type_error: PAGINATION.CURSOR.ERROR_MESSAGE,
  }),
});

/**********************************************************************************/

export { cursorSchema, parseValidationResult, VALIDATION };
