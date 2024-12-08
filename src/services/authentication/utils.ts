import {
  eq,
  HTTP_STATUS_CODES,
  MRSError,
  type Credentials,
  type RequestContext,
} from '../../utils/index.js';

/**********************************************************************************/

async function validateCredentials(params: {
  authentication: RequestContext['authentication'];
  database: RequestContext['database'];
  credentials: Credentials;
}) {
  const {
    authentication,
    database,
    credentials: { email, password },
  } = params;

  const { userId, hash } = await readUserFromDatabase(database, email);
  await validatePassword({ authentication, hash, password });

  return userId;
}

async function readUserFromDatabase(
  database: RequestContext['database'],
  email: string,
) {
  const handler = database.getHandler();
  const { user: userModel } = database.getModels();

  const users = await handler
    .select({ id: userModel.id, hash: userModel.hash })
    .from(userModel)
    .where(eq(userModel.email, email))
    .limit(1);
  if (!users.length) {
    throw new MRSError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'Email and/or password are incorrect',
    );
  }
  const { id: userId, hash } = users[0]!;

  return {
    userId,
    hash,
  } as const;
}

async function validatePassword(params: {
  authentication: RequestContext['authentication'];
  hash: string;
  password: string;
}) {
  try {
    const { authentication, hash, password } = params;

    const validPassword = await authentication.verifyPassword(hash, password);
    if (!validPassword) {
      throw new MRSError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        'Email and/or password are incorrect',
      );
    }
  } catch (err) {
    if (err instanceof MRSError) {
      throw err;
    }

    throw new MRSError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'Email and/or password are incorrect',
    );
  }
}

async function generateTokens(
  authentication: RequestContext['authentication'],
  userId: string,
) {
  const { accessTokenExpirationTime, refreshTokenExpirationTime } =
    authentication.getExpirationTime();

  const [accessToken, refreshToken] = await Promise.all([
    authentication.generateAccessToken(userId, accessTokenExpirationTime),
    authentication.generateRefreshToken(userId, refreshTokenExpirationTime),
  ]);

  return {
    accessToken,
    refreshToken,
  } as const;
}

async function refreshAccessToken(
  authentication: RequestContext['authentication'],
  refreshToken: string,
) {
  const { accessTokenExpirationTime } = authentication.getExpirationTime();

  try {
    const {
      payload: { sub: userId },
    } = await authentication.validateToken(refreshToken, 'refresh');
    if (!userId) {
      throw new MRSError(HTTP_STATUS_CODES.UNAUTHORIZED, 'Unauthorized');
    }

    const refreshedToken = await authentication.generateAccessToken(
      userId,
      accessTokenExpirationTime,
    );

    return refreshedToken;
  } catch (err) {
    if (err instanceof MRSError) {
      throw err;
    }

    throw new MRSError(HTTP_STATUS_CODES.UNAUTHORIZED, 'Unauthorized');
  }
}

/**********************************************************************************/

export { generateTokens, refreshAccessToken, validateCredentials };
