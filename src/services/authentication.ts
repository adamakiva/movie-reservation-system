import argon2 from 'argon2';
import { eq } from 'drizzle-orm';

import {
  type RequestContext,
  HTTP_STATUS_CODES,
  MRSError,
} from '../utils/index.js';
import type { authenticationValidator } from '../validators/index.js';

type Credentials = ReturnType<typeof authenticationValidator.validateLogin>;

/**********************************************************************************/

async function login(ctx: RequestContext, credentials: Credentials) {
  const { database, authentication } = ctx;
  const handler = database.getHandler();
  const { authentication: authenticationModel, user: userModel } =
    database.getModels();
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
  const { id, hash } = users[0]!;

  const validPassword = await argon2.verify(hash, password);
  if (!validPassword) {
    throw new MRSError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'User email and/or password are incorrect',
    );
  }

  const { accessToken, refreshToken } = await authentication.generateTokens(id);

  await handler
    .insert(authenticationModel)
    .values({
      userId: id,
      accessToken,
      refreshToken,
      expiresAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: authenticationModel.userId,
      set: { accessToken, refreshToken, expiresAt: Date.now() },
    });

  return { accessToken, refreshToken };
}

/**********************************************************************************/

export { login };
