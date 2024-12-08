import {
  after,
  assert,
  before,
  checkUserPassword,
  createRoles,
  createUsers,
  deleteUsers,
  generateRandomUsersData,
  getAdminRole,
  getAdminTokens,
  getAdminUserId,
  HTTP_STATUS_CODES,
  initServer,
  randomString,
  randomUUID,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type ServerParams,
  type User,
} from '../utils.js';

/**********************************************************************************/

await suite('Role integration tests', async () => {
  let serverParams: ServerParams = null!;
  before(async () => {
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await suite('Read', async () => {
    await test('Single page', async () => {
      await createRoles(serverParams, 3, async (_, roles) => {
        const roleIds = roles.map((role) => {
          return role.id;
        });
        await createUsers(
          serverParams,
          generateRandomUsersData(roleIds, 10),
          async ({ accessToken }, users) => {
            const adminId = getAdminUserId();

            const res = await sendHttpRequest({
              route: `${serverParams.routes.base}/users?${new URLSearchParams({ pageSize: '64' })}`,
              method: 'GET',
              headers: { Authorization: accessToken },
            });
            assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

            const responseBody = await res.json();
            assert.strictEqual(Array.isArray(responseBody.users), true);
            const fetchedUsers = (responseBody.users as User[]).filter(
              (user) => {
                return user.id !== adminId;
              },
            );
            fetchedUsers.forEach((user) => {
              const matchingUserIndex = users.findIndex((u) => {
                return u.id === user.id;
              });
              assert.deepStrictEqual(user, users[matchingUserIndex]);
              users.splice(matchingUserIndex, 1);
            });

            assert.strictEqual(!!responseBody.page, true);
            assert.strictEqual(responseBody.page.hasNext, false);
            assert.strictEqual(responseBody.page.cursor, null);
          },
        );
      });
    });
    await test('Many pages', async () => {
      await createRoles(serverParams, 8, async (_, roles) => {
        const roleIds = roles.map((role) => {
          return role.id;
        });
        await createUsers(
          serverParams,
          generateRandomUsersData(roleIds, 64),
          async ({ accessToken }, users) => {
            const adminId = getAdminUserId();
            let pagination = {
              hasNext: true,
              cursor: 'null',
            };

            /* eslint-disable no-await-in-loop */
            while (pagination.hasNext) {
              const res = await sendHttpRequest({
                route: `${serverParams.routes.base}/users?${new URLSearchParams({ cursor: pagination.cursor })}`,
                method: 'GET',
                headers: { Authorization: accessToken },
              });
              assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

              const responseBody = await res.json();
              assert.strictEqual(Array.isArray(responseBody.users), true);
              const fetchedUsers = (responseBody.users as User[]).filter(
                (user) => {
                  return user.id !== adminId;
                },
              );
              fetchedUsers.forEach((user) => {
                const matchingUserIndex = users.findIndex((u) => {
                  return u.id === user.id;
                });
                assert.deepStrictEqual(user, users[matchingUserIndex]);
                users.splice(matchingUserIndex, 1);
              });

              assert.strictEqual(!!responseBody.page, true);
              pagination = responseBody.page;
            }
            /* eslint-enable no-await-in-loop */
          },
        );
      });
    });
  });
  await suite('Create', async () => {
    await test('Body too large', async () => {
      const { status } = await sendHttpRequest({
        route: `${serverParams.routes.base}/users`,
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
    await test('Valid', async () => {
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
          route: `${serverParams.routes.base}/users`,
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
  });
  await suite('Update', async () => {
    await test('Body too large', async () => {
      const { status } = await sendHttpRequest({
        route: `${serverParams.routes.base}/users/${randomUUID()}`,
        method: 'PUT',
        payload: { firstName: 'a'.repeat(65_536) },
      });

      assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
    });
    await test('Valid', async () => {
      const { accessToken } = await getAdminTokens(serverParams);

      await createRoles(serverParams, 1, async (_, role) => {
        await createUsers(serverParams, 1, async (_, user) => {
          const updatedUserData = {
            firstName: randomString(),
            lastName: randomString(),
            email: `${randomString(8)}@ph.com`,
            password: '87654321',
            roleId: role.id,
          } as const;

          const res = await sendHttpRequest({
            route: `${serverParams.routes.base}/users/${user.id}`,
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
        });
      });
    });
  });
  await suite('Delete', async () => {
    await test('Existent', async () => {
      let userId = '';
      const { accessToken } = await getAdminTokens(serverParams);
      const { id: roleId } = getAdminRole();

      try {
        let res = await sendHttpRequest({
          route: `${serverParams.routes.base}/users`,
          method: 'POST',
          headers: { Authorization: accessToken },
          payload: generateRandomUsersData([roleId], 1),
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

        const { id } = (await res.json()) as User;
        userId = id;

        res = await sendHttpRequest({
          route: `${serverParams.routes.base}/users/${id}`,
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
    await test('Non-existent', async () => {
      const { accessToken } = await getAdminTokens(serverParams);

      const res = await sendHttpRequest({
        route: `${serverParams.routes.base}/users/${randomUUID()}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    });
  });
});
