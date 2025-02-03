import {
  after,
  assert,
  before,
  clearDatabase,
  CONSTANTS,
  getAdminRole,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomNumber,
  randomString,
  randomUUID,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  VALIDATION,
  type ServerParams,
} from '../utils.ts';

import {
  checkUserPassword,
  generateRandomUserData,
  seedUser,
  seedUsers,
  type User,
} from './utils.ts';

/**********************************************************************************/

const { USER } = VALIDATION;
const { SINGLE_PAGE, MULTIPLE_PAGES, LOT_OF_PAGES } = CONSTANTS;

/**********************************************************************************/

await suite('User integration tests', async () => {
  let serverParams: ServerParams = null!;
  before(async () => {
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Valid - Read a single page', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdUsers } = await seedUsers(serverParams, SINGLE_PAGE.CREATE);

    try {
      // 33 instead of 32 to include the admin as well
      const query = new URLSearchParams({
        'page-size': String(SINGLE_PAGE.SIZE + 1),
      });
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/users?${query}`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const responseBody = await res.json();
      assert.strictEqual(Array.isArray(responseBody.users), true);

      const fetchedUsers = responseBody.users as User[];
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

      assert.strictEqual(!!responseBody.page, true);
      assert.strictEqual(responseBody.page.hasNext, false);
      assert.strictEqual(responseBody.page.cursor, null);
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Read many pages', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdUsers } = await seedUsers(
      serverParams,
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
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/users?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.users), true);

        const fetchedUsers = responseBody.users as User[];
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

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(createdUsers.length, 0);
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Read a lot pages', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdUsers } = await seedUsers(serverParams, LOT_OF_PAGES.CREATE);

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
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/users?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.users), true);

        const fetchedUsers = responseBody.users as User[];
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

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(createdUsers.length, 0);
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/users`,
      method: 'POST',
      payload: {
        firstName: randomString(CONSTANTS.ONE_MEGABYTE_IN_BYTES),
        lastName: randomString(USER.LAST_NAME.MIN_LENGTH.VALUE + 1),
        email: `${randomString(randomNumber(USER.EMAIL.MIN_LENGTH.VALUE + 1, USER.EMAIL.MAX_LENGTH.VALUE / 2))}@ph.com`,
        password: randomString(USER.PASSWORD.MIN_LENGTH.VALUE + 1),
        roleId: randomUUID(),
      },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { id: roleId, name: roleName } = getAdminRole();

    try {
      const userData = generateRandomUserData(roleId);

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/users`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: userData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id, ...createdUser } = (await res.json()) as User;
      const { roleId: _1, password: _2, ...expectedUser } = userData;

      assert.deepStrictEqual(createdUser, {
        ...expectedUser,
        role: roleName,
      });
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/users/${randomUUID()}`,
      method: 'PUT',
      payload: { firstName: randomString(CONSTANTS.ONE_MEGABYTE_IN_BYTES) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdUser, createdRole } = await seedUser(serverParams, true);

    try {
      const updatedUserData = generateRandomUserData(createdRole.id);

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/users/${createdUser.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedUserData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const updatedUser = await res.json();
      const { password, roleId, ...updatedUserFields } = updatedUserData;
      assert.deepStrictEqual(
        {
          ...createdUser,
          ...updatedUserFields,
          role: createdRole.name,
        },
        updatedUser,
      );
      await checkUserPassword(serverParams, {
        email: updatedUserData.email,
        password: updatedUserData.password,
      });
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Delete existent user', async () => {
    let userId = '';
    const { accessToken } = await getAdminTokens(serverParams);
    const { id: roleId } = getAdminRole();

    try {
      let res = await sendHttpRequest({
        route: `${serverParams.routes.http}/users`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: generateRandomUserData(roleId),
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      ({ id: userId } = (await res.json()) as User);

      res = await sendHttpRequest({
        route: `${serverParams.routes.http}/users/${userId}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Delete non-existent user', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const res = await sendHttpRequest({
      route: `${serverParams.routes.http}/users/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
    });

    const responseBody = await res.text();

    assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
