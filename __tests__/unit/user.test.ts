import {
  after,
  before,
  initServer,
  mockLogger,
  suite,
  terminateServer,
  test,
  VALIDATION,
  type LoggerHandler,
  type ServerParams,
} from '../utils.js';

/**********************************************************************************/

const { USER } = VALIDATION;

/**********************************************************************************/

await suite('User unit tests', async () => {
  let logger: LoggerHandler = null!;
  let serverParams: ServerParams = null!;
  before(async () => {
    ({ logger } = mockLogger());
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await suite('Read', async () => {
    await suite('Single', async () => {
      await suite('Validation layer', async () => {
        await suite('User id', async () => {
          await test('Missing', () => {});
          await test('Empty', () => {});
          await test('Invalid', () => {});
        });
      });
      await suite('Service layer', async () => {
        await test('Non-existent', async () => {});
      });
    });
    await suite('Multiple', async () => {
      await suite('Validation layer', async () => {
        await suite('Cursor', async () => {
          await test('Empty', () => {});
          await test('Too short', () => {});
          await test('Too long', () => {});
          await test('Invalid', () => {});
        });
        await suite('Page size', async () => {
          await test('Too low', () => {});
          await test('Too high', () => {});
          await test('Invalid', () => {});
        });
      });
    });
  });
  await suite('Create', async () => {
    await suite('Validation layer', async () => {
      await suite('First name', async () => {
        await test('Missing', () => {});
        await test('Empty', () => {});
        await test('Too short', () => {});
        await test('Too long', () => {});
      });
      await suite('Last name', async () => {
        await test('Missing', () => {});
        await test('Empty', () => {});
        await test('Too short', () => {});
        await test('Too long', () => {});
      });
      await suite('Email', async () => {
        await test('Missing', () => {});
        await test('Empty', () => {});
        await test('Too short', () => {});
        await test('Too long', () => {});
        await test('Invalid', () => {});
      });
      await suite('Password', async () => {
        await test('Missing', () => {});
        await test('Empty', () => {});
        await test('Too short', () => {});
        await test('Too long', () => {});
      });
      await suite('Role id', async () => {
        await test('Missing', () => {});
        await test('Empty', () => {});
        await test('Invalid', () => {});
      });
    });
    await suite('Service layer', async () => {
      await test('Duplicate', async () => {});
      await test('Non-existent role id', async () => {});
    });
  });
  await suite('Update', async () => {
    await suite('Validation layer', async () => {
      await test('No updates', () => {});
      await suite('User id', async () => {
        await test('Missing', () => {});
        await test('Empty', () => {});
        await test('Invalid', () => {});
      });
      await suite('First name', async () => {
        await test('Empty', () => {});
        await test('Too short', () => {});
        await test('Too long', () => {});
      });
      await suite('Last name', async () => {
        await test('Empty', () => {});
        await test('Too short', () => {});
        await test('Too long', () => {});
      });
      await suite('Email', async () => {
        await test('Empty', () => {});
        await test('Too short', () => {});
        await test('Too long', () => {});
        await test('Invalid', () => {});
      });
      await suite('Password', async () => {
        await test('Empty', () => {});
        await test('Too short', () => {});
        await test('Too long', () => {});
      });
      await suite('Role id', async () => {
        await test('Empty', () => {});
        await test('Invalid', () => {});
      });
    });
    await suite('Service layer', async () => {
      await test('Non-existent', async () => {});
      await test('Duplicate', async () => {});
      await test('Non-existent role id', async () => {});
    });
  });
  await suite('Delete', async () => {
    await suite('Validation layer', async () => {
      await suite('User id', async () => {
        await test('Missing', () => {});
        await test('Empty', () => {});
        await test('Invalid', () => {});
      });
    });
  });
});
