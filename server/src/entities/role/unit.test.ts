import {
  after,
  assert,
  before,
  clearDatabase,
  createHttpMocks,
  GeneralError,
  HTTP_STATUS_CODES,
  initServer,
  randomAlphaNumericString,
  randomUUID,
  ROLE,
  seedRole,
  seedRoles,
  suite,
  terminateServer,
  test,
  type ServerParams,
} from '../../tests/utils.ts';

import * as serviceFunctions from './service/index.ts';
import * as validationFunctions from './validator.ts';

/**********************************************************************************/

await suite('Role unit tests', async () => {
  let logger: ServerParams['logger'] = null!;
  let server: ServerParams['server'] = null!;
  let authentication: ServerParams['authentication'] = null!;
  let fileManager: ServerParams['fileManager'] = null!;
  let database: ServerParams['database'] = null!;
  let messageQueue: ServerParams['messageQueue'] = null!;
  before(async () => {
    ({ server, fileManager, authentication, database, messageQueue, logger } =
      await initServer());
  });
  after(async () => {
    await terminateServer(server, database);
  });

  await test('Invalid - Create validation: Missing name', (context) => {
    const { request, response } = createHttpMocks({
      logger,
    });

    const validateCreateRoleSpy = context.mock.fn(
      validationFunctions.validateCreateRole,
    );

    assert.throws(
      () => {
        validateCreateRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty name', (context) => {
    const { request, response } = createHttpMocks({
      logger,
      reqOptions: {
        body: {
          name: '',
        },
      },
    });

    const validateCreateRoleSpy = context.mock.fn(
      validationFunctions.validateCreateRole,
    );

    assert.throws(
      () => {
        validateCreateRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Name too short', (context) => {
    const { request, response } = createHttpMocks({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(ROLE.NAME.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateRoleSpy = context.mock.fn(
      validationFunctions.validateCreateRole,
    );

    assert.throws(
      () => {
        validateCreateRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Name too long', (context) => {
    const { request, response } = createHttpMocks({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(ROLE.NAME.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateCreateRoleSpy = context.mock.fn(
      validationFunctions.validateCreateRole,
    );

    assert.throws(
      () => {
        validateCreateRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create service: Duplicate entry', async () => {
    const { response } = createHttpMocks({ logger });
    const { name: roleName } = await seedRole(database);

    try {
      const roleToCreate = { name: roleName };

      await assert.rejects(
        async () => {
          await serviceFunctions.createRole(
            {
              authentication,
              database,
              fileManager,
              messageQueue,
              logger,
            },
            roleToCreate,
          );
        },
        (error: GeneralError) => {
          assert.strictEqual(error instanceof GeneralError, true);
          assert.deepStrictEqual(error.getClientError(response), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Role '${roleName}' already exists`,
          });

          return true;
        },
      );
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Invalid - Update validation: Without updates', (context) => {
    const { request, response } = createHttpMocks({
      logger,
      reqOptions: {
        params: {
          movie_id: randomUUID(),
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(
      validationFunctions.validateUpdateRole,
    );

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing id', (context) => {
    const { request, response } = createHttpMocks({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(ROLE.NAME.MIN_LENGTH.VALUE + 1),
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(
      validationFunctions.validateUpdateRole,
    );

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty id', (context) => {
    const { request, response } = createHttpMocks({
      logger,
      reqOptions: {
        params: {
          role_id: '',
        },
        body: {
          name: randomAlphaNumericString(ROLE.NAME.MIN_LENGTH.VALUE + 1),
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(
      validationFunctions.validateUpdateRole,
    );

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid id', (context) => {
    const { request, response } = createHttpMocks({
      logger,
      reqOptions: {
        params: {
          role_id: randomAlphaNumericString(),
        },
        body: {
          name: randomAlphaNumericString(ROLE.NAME.MIN_LENGTH.VALUE + 1),
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(
      validationFunctions.validateUpdateRole,
    );

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing name', (context) => {
    const { request, response } = createHttpMocks({
      logger,
      reqOptions: {
        params: {
          role_id: randomUUID(),
        },
        body: {
          name: '',
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(
      validationFunctions.validateUpdateRole,
    );

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Name too short', (context) => {
    const { request, response } = createHttpMocks({
      logger,
      reqOptions: {
        params: {
          role_id: randomUUID(),
        },
        body: {
          name: randomAlphaNumericString(ROLE.NAME.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(
      validationFunctions.validateUpdateRole,
    );

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Name too long', (context) => {
    const { request, response } = createHttpMocks({
      logger,
      reqOptions: {
        params: {
          role_id: randomUUID(),
        },
        body: {
          name: randomAlphaNumericString(ROLE.NAME.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(
      validationFunctions.validateUpdateRole,
    );

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update service: Duplicate entry', async () => {
    const { response } = createHttpMocks({ logger });
    const createdRoles = await seedRoles(database, 2);

    try {
      const roleToUpdate = {
        roleId: createdRoles[0]!.id,
        name: createdRoles[1]!.name,
      };

      await assert.rejects(
        async () => {
          await serviceFunctions.updateRole(
            {
              authentication,
              database,
              fileManager,
              messageQueue,
              logger,
            },
            roleToUpdate,
          );
        },
        (error: GeneralError) => {
          assert.strictEqual(error instanceof GeneralError, true);
          assert.deepStrictEqual(error.getClientError(response), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Role '${createdRoles[1]!.name}' already exists`,
          });

          return true;
        },
      );
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Invalid - Delete validation: Missing id', (context) => {
    const { request, response } = createHttpMocks({
      logger,
    });

    const validateDeleteRoleSpy = context.mock.fn(
      validationFunctions.validateDeleteRole,
    );

    assert.throws(
      () => {
        validateDeleteRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Empty id', (context) => {
    const { request, response } = createHttpMocks({
      logger,
      reqOptions: {
        params: {
          role_id: '',
        },
      },
    });

    const validateDeleteRoleSpy = context.mock.fn(
      validationFunctions.validateDeleteRole,
    );

    assert.throws(
      () => {
        validateDeleteRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Invalid id', (context) => {
    const { request, response } = createHttpMocks({
      logger,
      reqOptions: {
        params: {
          role_id: randomAlphaNumericString(),
        },
      },
    });

    const validateDeleteRoleSpy = context.mock.fn(
      validationFunctions.validateDeleteRole,
    );

    assert.throws(
      () => {
        validateDeleteRoleSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
});
