// Import directly and not via index.ts to prevent importing the entire project
// and/or import issues with drizzle
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
    mode: 'date',
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
} as const;

/**********************************************************************************/

const roleModel = pgTable(
  'role',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: varchar('name').unique().notNull(),
    ...timestamps,
  },
  (table) => {
    return [
      uniqueIndex('role_name_unique_index').using('btree', table.name.asc()),
    ];
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
      uniqueIndex('user_email_unique_index').using('btree', table.email.asc()),
      index('user_role_id_index').using('btree', table.roleId.asc()),
      uniqueIndex('user_cursor_unique_index').using(
        'btree',
        table.id.asc(),
        table.createdAt.asc(),
      ),
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
    return [
      uniqueIndex('genre_name_unique_index').using('btree', table.name.asc()),
    ];
  },
);

const movieModel = pgTable(
  'movie',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    title: varchar('title').unique().notNull(),
    description: varchar('description').notNull(),
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
  },
  (table) => {
    return [
      index('movie_genre_id_index').using('btree', table.genreId.asc()),
      uniqueIndex('movie_cursor_unique_index').using(
        'btree',
        table.id.asc(),
        table.createdAt.asc(),
      ),
    ];
  },
);

const moviePosterModel = pgTable('movie_poster', {
  movieId: uuid('movie_id')
    .primaryKey()
    .references(
      () => {
        return movieModel.id;
      },
      // On delete is 'no action' instead of 'cascade' since we need to delete
      // the actual file as well. As a result it is done manually
      { onDelete: 'no action', onUpdate: 'cascade' },
    ),
  fileFullPath: varchar('file_full_path').notNull(),
  fileSizeInBytes: varchar('file_size_in_bytes').notNull(),
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
      index('showtime_movie_index').using('btree', table.movieId.asc()),
      index('showtime_hall_index').using('btree', table.hallId.asc()),
    ];
  },
);

const showtimeSummaryModel = pgTable('showtime_summary', {
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
  moviePosterModel,
  roleModel,
  showtimeModel,
  showtimeSummaryModel,
  userModel,
};
