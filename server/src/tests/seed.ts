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
  const { server, authentication, database } = await initServer();
  const [{ createdUsers }, { createdShowtimes }] = await Promise.all([
    seedUsers(authentication, database, 10_000, false, 1),
    seedShowtimes(database, 10_000, 1),
    seedGenres(database, 10_000),
  ]);
  const userIds = createdUsers.map(({ id }) => {
    return id;
  });
  const showtimeIds = createdShowtimes.map(({ id }) => {
    return id;
  });
  await seedUserShowtimes(database, 10_000, userIds, showtimeIds);

  await server.close();
  console.info('Done');
}

/**********************************************************************************/

async function seedUserShowtimes(
  database: ServerParams['database'],
  amount: number,
  userIds: string[],
  showtimeIds: string[],
) {
  const handler = database.getHandler();
  const { userShowtime: userShowtimeModel } = database.getModels();

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
