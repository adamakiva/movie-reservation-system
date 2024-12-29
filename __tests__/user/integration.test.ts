import {
  after,
  assert,
  before,
  getAdminRole,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomString,
  randomUUID,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type ServerParams,
} from '../utils.js';

import {
  checkUserPassword,
  deleteRoles,
  deleteUsers,
  generateRandomUserData,
  seedUser,
  seedUsers,
  type User,
} from './utils.js';

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
    const userIds: string[] = [];
    const roleIds: string[] = [];

    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdUsers: users, createdRoles: roles } = await seedUsers(
      serverParams,
      32,
      false,
    );
    userIds.push(
      ...users.map(({ id }) => {
        return id;
      }),
    );
    roleIds.push(
      ...roles.map(({ id }) => {
        return id;
      }),
    );

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/users?${new URLSearchParams({ pageSize: '64' })}`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const responseBody = await res.json();
      assert.strictEqual(Array.isArray(responseBody.users), true);

      const fetchedUsers = responseBody.users as User[];
      for (let i = users.length - 1; i >= 0; --i) {
        const matchingUserIndex = fetchedUsers.findIndex((u) => {
          return u.id === users[i]!.id;
        });
        if (matchingUserIndex !== -1) {
          assert.deepStrictEqual(users[i], fetchedUsers[matchingUserIndex]);
          users.splice(i, 1);
        }
      }
      assert.strictEqual(users.length, 0);

      assert.strictEqual(!!responseBody.page, true);
      assert.strictEqual(responseBody.page.hasNext, false);
      assert.strictEqual(responseBody.page.cursor, null);
    } finally {
      await deleteUsers(serverParams, ...userIds);
      await deleteRoles(serverParams, ...roleIds);
    }
  });
  await test('Valid - Read many pages', async () => {
    const userIds: string[] = [];
    const roleIds: string[] = [];

    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdUsers: users, createdRoles: roles } = await seedUsers(
      serverParams,
      128,
      false,
    );
    userIds.push(
      ...users.map(({ id }) => {
        return id;
      }),
    );
    roleIds.push(
      ...roles.map(({ id }) => {
        return id;
      }),
    );

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/users?${new URLSearchParams({ cursor: pagination.cursor, pageSize: '16' })}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.users), true);

        const fetchedUsers = responseBody.users as User[];
        for (let i = users.length - 1; i >= 0; --i) {
          const matchingUserIndex = fetchedUsers.findIndex((u) => {
            return u.id === users[i]!.id;
          });
          if (matchingUserIndex !== -1) {
            assert.deepStrictEqual(users[i], fetchedUsers[matchingUserIndex]);
            users.splice(i, 1);
          }
        }

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(users.length, 0);
    } finally {
      await deleteUsers(serverParams, ...userIds);
      await deleteRoles(serverParams, ...roleIds);
    }
  });
  await test('Valid - Read a lot pages', async () => {
    const userIds: string[] = [];
    const roleIds: string[] = [];

    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdUsers: users, createdRoles: roles } = await seedUsers(
      serverParams,
      8_192,
      false,
    );
    userIds.push(
      ...users.map(({ id }) => {
        return id;
      }),
    );
    roleIds.push(
      ...roles.map(({ id }) => {
        return id;
      }),
    );

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/users?${new URLSearchParams({ cursor: pagination.cursor, pageSize: '16' })}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.users), true);

        const fetchedUsers = responseBody.users as User[];
        for (let i = users.length - 1; i >= 0; --i) {
          const matchingUserIndex = fetchedUsers.findIndex((u) => {
            return u.id === users[i]!.id;
          });
          if (matchingUserIndex !== -1) {
            assert.deepStrictEqual(users[i], fetchedUsers[matchingUserIndex]);
            users.splice(i, 1);
          }
        }

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(users.length, 0);
    } finally {
      await deleteUsers(serverParams, ...userIds);
      await deleteRoles(serverParams, ...roleIds);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/users`,
      method: 'POST',
      payload: {
        firstName: 'a'.repeat(65_536),
        lastName: randomString(),
        email: `${randomString(8)}@ph.com`,
        password: '12345678',
        roleId: randomUUID(),
      },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    let userId = '';
    const { accessToken } = await getAdminTokens(serverParams);
    const { id: roleId, name: roleName } = getAdminRole();

    try {
      const userData = {
        firstName: randomString(),
        lastName: randomString(),
        email: `${randomString(8)}@ph.com`,
        password: '12345678',
        roleId,
      } as const;

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/users`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: userData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id, ...createdUser } = (await res.json()) as User;
      const { roleId: _1, password: _2, ...expectedUser } = userData;
      userId = id;

      assert.deepStrictEqual(createdUser, {
        ...expectedUser,
        role: roleName,
      });
    } finally {
      await deleteUsers(serverParams, userId);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/users/${randomUUID()}`,
      method: 'PUT',
      payload: { firstName: 'a'.repeat(65_536) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const roleIds: string[] = [];
    const userIds: string[] = [];

    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdUser: user, createdRole: role } = await seedUser(
      serverParams,
      true,
    );
    roleIds.push(role.id);
    userIds.push(user.id);

    try {
      const updatedUserData = {
        firstName: randomString(),
        lastName: randomString(),
        email: `${randomString(8)}@ph.com`,
        password: '87654321',
        roleId: role.id,
      } as const;

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/users/${user.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedUserData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const updatedUser = await res.json();
      const { password, roleId, ...updatedUserFields } = updatedUserData;
      assert.deepStrictEqual(
        {
          ...user,
          ...updatedUserFields,
          role: role.name,
        },
        updatedUser,
      );
      await checkUserPassword(serverParams, {
        email: updatedUserData.email,
        password: updatedUserData.password,
      });
    } finally {
      await deleteUsers(serverParams, ...userIds);
      await deleteRoles(serverParams, ...roleIds);
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

      const { id } = (await res.json()) as User;
      userId = id;

      res = await sendHttpRequest({
        route: `${serverParams.routes.http}/users/${id}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    } finally {
      await deleteUsers(serverParams, userId);
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
