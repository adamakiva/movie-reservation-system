import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  point,
  real,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**********************************************************************************/

const timestamps = {
  createdAt: timestamp('created_at', {
    mode: 'string',
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'string',
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
};

/**********************************************************************************/

const roleModel = pgTable(
  'role',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: varchar('name').notNull(),
    ...timestamps,
  },
  (table) => {
    return [{ nameIndex: index().using('btree', table.name) }];
  },
);

const userModel = pgTable(
  'user',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    firstName: varchar('first_name').notNull(),
    lastName: varchar('last_name').notNull(),
    email: varchar('email').unique().notNull(),
    hash: varchar('hash').notNull(),
    roleId: uuid('role_id')
      .references(
        () => {
          return roleModel.id;
        },
        { onDelete: 'no action', onUpdate: 'cascade' },
      )
      .notNull(),
    ...timestamps,
  },
  (table) => {
    return [
      {
        emailUniqueIndex: uniqueIndex().using('btree', table.email),
        roleIndex: index().using('btree', table.roleId),
      },
    ];
  },
);

/**********************************************************************************/

const genreModel = pgTable(
  'genre',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: varchar('name').unique().notNull(),
    ...timestamps,
  },
  (table) => {
    return [{ nameIndex: index().using('btree', table.name) }];
  },
);

const movieModel = pgTable('movie', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  title: varchar('title').unique().notNull(),
  description: varchar('description').notNull(),
  relativeImagePath: varchar('relative_image_path').notNull(),
  price: real('price').notNull(),
  genreId: uuid('genre_id')
    .references(
      () => {
        return genreModel.id;
      },
      { onDelete: 'no action', onUpdate: 'cascade' },
    )
    .notNull(),
  ...timestamps,
});

const hallModel = pgTable('hall', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  name: varchar('name').unique().notNull(),
  rows: smallint('rows').notNull(),
  columns: smallint('columns').notNull(),
  ...timestamps,
});

const showtimeModel = pgTable(
  'showtime',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    at: timestamp('at', {
      mode: 'string',
      precision: 3,
      withTimezone: true,
    }).notNull(),
    reservations: point('reservations')
      .array()
      .default(sql`ARRAY[]::point[]`),
    movieId: uuid('movie_id')
      .references(
        () => {
          return movieModel.id;
        },
        { onDelete: 'cascade', onUpdate: 'cascade' },
      )
      .notNull(),
    hallId: uuid('hall_id')
      .references(
        () => {
          return hallModel.id;
        },
        { onDelete: 'cascade', onUpdate: 'cascade' },
      )
      .notNull(),
    ...timestamps,
  },
  (table) => {
    return [
      {
        movieIndex: index().using('btree', table.movieId),
        hallIndex: index().using('btree', table.hallId),
      },
    ];
  },
);

const showtimeSummary = pgTable('showtime_summary', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  at: timestamp('at', {
    mode: 'string',
    precision: 3,
    withTimezone: true,
  }).notNull(),
  reservations: point('reservations')
    .array()
    .default(sql`ARRAY[]::point[]`),
  movieName: varchar('movie_name').notNull(),
  revenue: real('revenue').notNull(),
  ...timestamps,
});

/**********************************************************************************/

export {
  genreModel,
  hallModel,
  movieModel,
  roleModel,
  showtimeModel,
  showtimeSummary,
  userModel,
};
