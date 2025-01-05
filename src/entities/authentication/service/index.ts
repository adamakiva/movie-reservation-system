import type { Credentials, RequestContext } from '../../../utils/index.js';

import * as utils from './utils.js';

/**********************************************************************************/

async function login(context: RequestContext, credentials: Credentials) {
  const { authentication, database } = context;

  const userId = await utils.validateCredentials({
    authentication,
    database,
    credentials,
  });

  const tokens = await utils.generateTokens(authentication, userId);

  return tokens;
}

async function refreshAccessToken(
  context: RequestContext,
  refreshToken: string,
) {
  const { authentication } = context;

  const refreshedToken = await utils.refreshAccessToken(
    authentication,
    refreshToken,
  );

  return refreshedToken;
}

/**********************************************************************************/

export { login, refreshAccessToken };
