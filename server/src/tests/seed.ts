import { mock } from 'node:test';

import {
  initServer,
  randomNumber,
  randomUUID,
  seedGenres,
  seedShowtimes,
  seedUsers,
  type ServerParams,
} from './utils.ts';

/**********************************************************************************/

async function seed() {
  console.info('Seeding data...');

  const { server, authentication, database, logger } = await initServer();

  (['debug', 'info', 'log', 'warn', 'error'] as const).forEach((level) => {
    mock.method(logger, level, emptyFunction);
  });

  const [{ createdUsers }, { createdShowtimes }] = await Promise.all([
    seedUsers(authentication, database, 10_000, false, 1),
    seedShowtimes(database, 10_000, 1),
    seedGenres(database, 10_000),
  ]);
  await seedUserShowtimes(database, 10_000, createdUsers, createdShowtimes);

  await server.close();

  console.info('Done');
}

function emptyFunction() {
  // On purpose
}

/**********************************************************************************/

async function seedUserShowtimes(
  database: ServerParams['database'],
  amount: number,
  createdUsers: Awaited<ReturnType<typeof seedUsers>>['createdUsers'],
  createdShowtimes: Awaited<
    ReturnType<typeof seedShowtimes>
  >['createdShowtimes'],
) {
  const handler = database.getHandler();
  const { userShowtime: userShowtimeModel } = database.getModels();

  const userIds = createdUsers.map(({ id }) => {
    return id;
  });
  const showtimeIds = createdShowtimes.map(({ id }) => {
    return id;
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const userShowtimeData = [...Array(amount)].map(() => {
    return {
      row: randomNumber(1, 128),
      column: randomNumber(1, 128),
      userId: userIds[randomNumber(0, userIds.length)]!,
      showtimeId: showtimeIds[randomNumber(0, showtimeIds.length)]!,
      transactionId: randomUUID(),
    } as const;
  });

  await handler.insert(userShowtimeModel).values(userShowtimeData);
}

/**********************************************************************************/

await seed();
