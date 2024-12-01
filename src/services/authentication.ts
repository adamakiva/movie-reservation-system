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
  const handler = database.getHandler();
  const { user: userModel } = database.getModels();
  const { email, password } = credentials;

  const users = await handler
    .select({ id: userModel.id, hash: userModel.hash })
    .from(userModel)
    .where(eq(userModel.email, email))
    .limit(1);
  if (!users.length) {
    throw new MRSError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'User email and/or password are incorrect',
    );
  }
  const { id: userId, hash } = users[0]!;

  const validPassword = await argon2.verify(hash, password, {
    secret: hashSecret,
  });
  if (!validPassword) {
    throw new MRSError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'User email and/or password are incorrect',
    );
  }
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

async function refresh(ctx: RequestContext, refreshToken: string) {
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

export { login, refresh };
