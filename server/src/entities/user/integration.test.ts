import {
  after,
  assert,
  before,
  checkUserPassword,
  clearDatabase,
  CONSTANTS,
  generateRandomUserData,
  getAdminRole,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomAlphaNumericString,
  randomNumber,
  randomUUID,
  seedUser,
  seedUsers,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  USER,
  type PaginatedResult,
  type ServerParams,
  type User,
} from '../../tests/utils.ts';

/**********************************************************************************/

const { SINGLE_PAGE, MULTIPLE_PAGES, LOT_OF_PAGES } = CONSTANTS;

/**********************************************************************************/

await suite('User integration tests', async () => {
  let server: ServerParams['server'] = null!;
  let authentication: ServerParams['authentication'] = null!;
  let database: ServerParams['database'] = null!;
  let httpRoute: ServerParams['routes']['http'] = null!;
  before(async () => {
    ({
      server,
      authentication,
      database,
      routes: { http: httpRoute },
    } = await initServer());
  });
  after(async () => {
    await terminateServer(server, database);
  });

  await test('Valid - Read a single page', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdUsers } = await seedUsers(
      authentication,
      database,
      SINGLE_PAGE.CREATE,
    );

    try {
      // +1 to include the admin as well
      const query = new URLSearchParams({
        'page-size': String(SINGLE_PAGE.SIZE + 1),
      });
      const {
        statusCode,
        responseBody: { users: fetchedUsers, page },
      } = await sendHttpRequest<
        'GET',
        'json',
        PaginatedResult<{ users: User[] }>
      >({
        route: `${httpRoute}/users?${query}`,
        method: 'GET',
        headers: { Authorization: accessToken },
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
      assert.strictEqual(Array.isArray(fetchedUsers), true);

      for (let i = createdUsers.length - 1; i >= 0; --i) {
        const matchingUserIndex = fetchedUsers.findIndex((u) => {
          return u.id === createdUsers[i]!.id;
        });
        if (matchingUserIndex !== -1) {
          assert.deepStrictEqual(
            createdUsers[i],
            fetchedUsers[matchingUserIndex],
          );
          createdUsers.splice(i, 1);
        }
      }
      assert.strictEqual(createdUsers.length, 0);

      assert.strictEqual(!!page, true);
      assert.strictEqual(page.hasNext, false);
      assert.strictEqual(page.cursor, null);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read many pages', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdUsers } = await seedUsers(
      authentication,
      database,
      MULTIPLE_PAGES.CREATE,
    );

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          cursor: pagination.cursor,
          'page-size': String(MULTIPLE_PAGES.SIZE),
        });
        const {
          statusCode,
          responseBody: { users: fetchedUsers, page },
        } = await sendHttpRequest<
          'GET',
          'json',
          PaginatedResult<{ users: User[] }>
        >({
          route: `${httpRoute}/users?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
          responseType: 'json',
        });
        assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
        assert.strictEqual(Array.isArray(fetchedUsers), true);

        for (let i = createdUsers.length - 1; i >= 0; --i) {
          const matchingUserIndex = fetchedUsers.findIndex((u) => {
            return u.id === createdUsers[i]!.id;
          });
          if (matchingUserIndex !== -1) {
            assert.deepStrictEqual(
              createdUsers[i],
              fetchedUsers[matchingUserIndex],
            );
            createdUsers.splice(i, 1);
          }
        }

        assert.strictEqual(!!page, true);
        //@ts-expect-error null and 'null' (string) are interchangeable in this
        // context
        pagination = page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(createdUsers.length, 0);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read a lot pages', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdUsers } = await seedUsers(
      authentication,
      database,
      LOT_OF_PAGES.CREATE,
    );

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          cursor: pagination.cursor,
          'page-size': String(LOT_OF_PAGES.SIZE),
        });
        const {
          statusCode,
          responseBody: { users: fetchedUsers, page },
        } = await sendHttpRequest<
          'GET',
          'json',
          PaginatedResult<{ users: User[] }>
        >({
          route: `${httpRoute}/users?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
          responseType: 'json',
        });
        assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
        assert.strictEqual(Array.isArray(fetchedUsers), true);

        for (let i = createdUsers.length - 1; i >= 0; --i) {
          const matchingUserIndex = fetchedUsers.findIndex((u) => {
            return u.id === createdUsers[i]!.id;
          });
          if (matchingUserIndex !== -1) {
            assert.deepStrictEqual(
              createdUsers[i],
              fetchedUsers[matchingUserIndex],
            );
            createdUsers.splice(i, 1);
          }
        }

        assert.strictEqual(!!page, true);
        //@ts-expect-error null and 'null' (string) are interchangeable in this
        // context
        pagination = page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(createdUsers.length, 0);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode } = await sendHttpRequest<'POST'>({
      route: `${httpRoute}/users`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: {
        firstName: randomAlphaNumericString(CONSTANTS.ONE_MEGABYTE),
        lastName: randomAlphaNumericString(USER.LAST_NAME.MIN_LENGTH.VALUE + 1),
        email: `${randomAlphaNumericString(randomNumber(USER.EMAIL.MIN_LENGTH.VALUE + 1, USER.EMAIL.MAX_LENGTH.VALUE / 2))}@ph.com`,
        password: randomAlphaNumericString(USER.PASSWORD.MIN_LENGTH.VALUE + 1),
        roleId: randomUUID(),
      },
      responseType: 'bytes',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { id: roleId, name: roleName } = getAdminRole();

    try {
      const userData = generateRandomUserData(roleId);

      const {
        statusCode,
        responseBody: { id, ...createdUser },
      } = await sendHttpRequest<'POST', 'json', User>({
        route: `${httpRoute}/users`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: userData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);

      const { roleId: _1, password: _2, ...expectedUser } = userData;

      assert.deepStrictEqual(createdUser, {
        ...expectedUser,
        role: roleName,
      });
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode } = await sendHttpRequest<'PUT'>({
      route: `${httpRoute}/users/${randomUUID()}`,
      method: 'PUT',
      headers: { Authorization: accessToken },
      payload: {
        firstName: randomAlphaNumericString(CONSTANTS.ONE_MEGABYTE),
      },
      responseType: 'bytes',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdUser, createdRole } = await seedUser(
      authentication,
      database,
      true,
    );

    try {
      const updatedUserData = generateRandomUserData(createdRole.id);

      const { statusCode, responseBody: updatedUser } = await sendHttpRequest<
        'PUT',
        'json',
        User
      >({
        route: `${httpRoute}/users/${createdUser.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedUserData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);

      const { password, roleId, ...updatedUserFields } = updatedUserData;
      assert.deepStrictEqual(
        {
          ...createdUser,
          ...updatedUserFields,
          role: createdRole.name,
        },
        updatedUser,
      );
      await checkUserPassword({
        authentication,
        database,
        credentials: {
          email: updatedUserData.email,
          password: updatedUserData.password,
        },
      });
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Delete existent user', async () => {
    let userId = '';
    const { accessToken } = await getAdminTokens(httpRoute);
    const { id: roleId } = getAdminRole();

    try {
      const {
        statusCode,
        responseBody: { id },
      } = await sendHttpRequest<'POST', 'json', User>({
        route: `${httpRoute}/users`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: generateRandomUserData(roleId),
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);
      userId = id;

      const result = await sendHttpRequest<'DELETE', 'text', string>({
        route: `${httpRoute}/users/${userId}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
        responseType: 'text',
      });

      assert.strictEqual(result.statusCode, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(result.responseBody, '');
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Delete non-existent user', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode, responseBody } = await sendHttpRequest<
      'DELETE',
      'text',
      string
    >({
      route: `${httpRoute}/users/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
      responseType: 'text',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
