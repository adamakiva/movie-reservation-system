import * as service from '../../src/entities/role/service/index.js';
import * as validator from '../../src/entities/role/validator.js';

import {
  after,
  assert,
  before,
  createHttpMocks,
  HTTP_STATUS_CODES,
  initServer,
  mockLogger,
  MRSError,
  randomString,
  randomUUID,
  suite,
  terminateServer,
  test,
  VALIDATION,
  type LoggerHandler,
  type ResponseWithContext,
  type ServerParams,
} from '../utils.js';

import { deleteRoles, seedRole, seedRoles } from './utils.js';

/**********************************************************************************/

const { ROLE } = VALIDATION;

/**********************************************************************************/

await suite('Role unit tests', async () => {
  let logger: LoggerHandler = null!;
  let serverParams: ServerParams = null!;
  before(async () => {
    ({ logger } = mockLogger());
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Invalid - Create validation: Missing name', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
    });

    const validateCreateRoleSpy = context.mock.fn(validator.validateCreateRole);

    assert.throws(
      () => {
        validateCreateRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty name', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: '',
        },
      },
    });

    const validateCreateRoleSpy = context.mock.fn(validator.validateCreateRole);

    assert.throws(
      () => {
        validateCreateRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Name too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: 'a'.repeat(ROLE.NAME.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateRoleSpy = context.mock.fn(validator.validateCreateRole);

    assert.throws(
      () => {
        validateCreateRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Name too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: 'a'.repeat(ROLE.NAME.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateCreateRoleSpy = context.mock.fn(validator.validateCreateRole);

    assert.throws(
      () => {
        validateCreateRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create service: Duplicate entry', async () => {
    const roleIds: string[] = [];

    const role = await seedRole(serverParams);
    roleIds.push(role.id);

    try {
      const roleToCreate = { name: role.name };

      await assert.rejects(
        async () => {
          await service.createRole(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              logger,
            },
            roleToCreate,
          );
        },
        (err) => {
          assert.strictEqual(err instanceof MRSError, true);
          assert.deepStrictEqual((err as MRSError).getClientError(), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Role '${role.name}' already exists`,
          });

          return true;
        },
      );
    } finally {
      await deleteRoles(serverParams, ...roleIds);
    }
  });
  await test('Invalid - Update validation: Without updates', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          roleId: randomUUID(),
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(validator.validateUpdateRole);

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomString(),
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(validator.validateUpdateRole);

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          roleId: '',
        },
        body: {
          name: randomString(),
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(validator.validateUpdateRole);

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          roleId: randomString(),
        },
        body: {
          name: randomString(),
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(validator.validateUpdateRole);

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing name', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          roleId: randomUUID(),
        },
        body: {
          name: '',
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(validator.validateUpdateRole);

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Name too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          roleId: randomUUID(),
        },
        body: {
          name: 'a'.repeat(ROLE.NAME.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(validator.validateUpdateRole);

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Name too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          roleId: randomUUID(),
        },
        body: {
          name: 'a'.repeat(ROLE.NAME.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateUpdateRoleSpy = context.mock.fn(validator.validateUpdateRole);

    assert.throws(
      () => {
        validateUpdateRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update service: Duplicate entry', async () => {
    const roleIds: string[] = [];

    const roles = await seedRoles(serverParams, 2);
    roleIds.push(
      ...roles.map(({ id }) => {
        return id;
      }),
    );

    try {
      const roleToUpdate = { roleId: roles[0]!.id, name: roles[1]!.name };

      await assert.rejects(
        async () => {
          await service.updateRole(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              logger,
            },
            roleToUpdate,
          );
        },
        (err) => {
          assert.strictEqual(err instanceof MRSError, true);
          assert.deepStrictEqual((err as MRSError).getClientError(), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Role '${roles[1]!.name}' already exists`,
          });

          return true;
        },
      );
    } finally {
      await deleteRoles(serverParams, ...roleIds);
    }
  });
  await test('Invalid - Delete validation: Missing id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
    });

    const validateDeleteRoleSpy = context.mock.fn(validator.validateDeleteRole);

    assert.throws(
      () => {
        validateDeleteRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Empty id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          roleId: '',
        },
      },
    });

    const validateDeleteRoleSpy = context.mock.fn(validator.validateDeleteRole);

    assert.throws(
      () => {
        validateDeleteRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Invalid id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          roleId: randomString(),
        },
      },
    });

    const validateDeleteRoleSpy = context.mock.fn(validator.validateDeleteRole);

    assert.throws(
      () => {
        validateDeleteRoleSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: ROLE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
});
