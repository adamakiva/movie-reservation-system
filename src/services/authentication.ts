import {
  argon2,
  eq,
  HTTP_STATUS_CODES,
  MRSError,
  type RequestContext,
} from '../utils/index.js';
import type { authenticationValidator } from '../validators/index.js';

/**********************************************************************************/

type Credentials = ReturnType<typeof authenticationValidator.validateLogin>;

/**********************************************************************************/

async function login(ctx: RequestContext, credentials: Credentials) {
  const { authentication, database, hashSecret } = ctx;

  const userId = await validateCredentials({
    database,
    credentials,
    hashSecret,
  });

  const { accessTokenExpirationTime, refreshTokenExpirationTime } =
    authentication.getExpirationTime();

  const [accessToken, refreshToken] = await Promise.all([
    authentication.generateAccessToken(userId, accessTokenExpirationTime),
    authentication.generateRefreshToken(userId, refreshTokenExpirationTime),
  ]);

  return {
    accessToken,
    refreshToken,
  };
}

async function refreshAccessToken(ctx: RequestContext, refreshToken: string) {
  try {
    const { authentication } = ctx;

    const { accessTokenExpirationTime } = authentication.getExpirationTime();

    const {
      payload: { sub: userId },
    } = await authentication.validateToken(refreshToken, 'refresh');
    if (!userId) {
      throw new MRSError(HTTP_STATUS_CODES.UNAUTHORIZED, 'Unauthorized');
    }

    return await authentication.generateAccessToken(
      userId,
      accessTokenExpirationTime,
    );
  } catch (err) {
    if (err instanceof MRSError) {
      throw err;
    }

    throw new MRSError(HTTP_STATUS_CODES.UNAUTHORIZED, 'Unauthorized');
  }
}

/**********************************************************************************/

async function validateCredentials(params: {
  database: RequestContext['database'];
  credentials: Credentials;
  hashSecret: Buffer;
}) {
  const {
    database,
    credentials: { email, password },
    hashSecret,
  } = params;

  const { userId, hash } = await findUser(database, email);
  await validatePassword({ hash, password, hashSecret });

  return userId;
}

async function findUser(database: RequestContext['database'], email: string) {
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
  };
}

async function validatePassword(params: {
  hash: string;
  password: string;
  hashSecret: Buffer;
}) {
  try {
    const { hash, password, hashSecret } = params;

    const validPassword = await argon2.verify(hash, password, {
      secret: hashSecret,
    });
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

/**********************************************************************************/

export { login, refreshAccessToken };
