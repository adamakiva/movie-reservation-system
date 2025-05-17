import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';

import { GeneralError, UnauthorizedError } from '../../utils/errors.ts';
import type { RequestContext, ResponseWithContext } from '../../utils/types.ts';

import * as authenticationValidator from './validator.ts';

/**********************************************************************************/

async function login(request: Request, response: ResponseWithContext) {
  const credentials = authenticationValidator.validateLogin(request);

  const { authentication, database } = response.locals.context;

  const userId = await validateCredentials({
    authentication,
    database,
    credentials,
  });

  const tokens = await generateTokens(authentication, userId);

  response.status(HTTP_STATUS_CODES.CREATED).json(tokens);
}

async function refreshAccessToken(
  request: Request,
  response: ResponseWithContext,
) {
  const { refreshToken } =
    authenticationValidator.validateRefreshAccessToken(request);

  const { authentication } = response.locals.context;
  const { accessTokenExpirationTime } = authentication.getExpirationTime();

  const {
    payload: { sub: userId, exp },
  } = await authentication.validateToken(refreshToken, 'refresh');
  if (!userId || !exp) {
    throw new UnauthorizedError('malformed');
  }

  const accessToken = await authentication.generateAccessToken(
    userId,
    accessTokenExpirationTime,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(accessToken);
}

/**********************************************************************************/

async function validateCredentials(params: {
  authentication: RequestContext['authentication'];
  database: RequestContext['database'];
  credentials: { email: string; password: string };
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

  const [user] = await handler
    .select({ id: userModel.id, hash: userModel.hash })
    .from(userModel)
    .where(eq(userModel.email, email))
    .limit(1);
  if (!user) {
    throw new GeneralError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'Email and/or password are incorrect',
    );
  }
  const { id: userId, hash } = user;

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

    const isValid = await authentication.verifyPassword(hash, password);
    if (!isValid) {
      throw new GeneralError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        'Email and/or password are incorrect',
      );
    }
  } catch (error) {
    if (error instanceof GeneralError) {
      throw error;
    }

    throw new GeneralError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'Email and/or password are incorrect',
      (error as { cause?: unknown }).cause,
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

/**********************************************************************************/

export { login, refreshAccessToken };
