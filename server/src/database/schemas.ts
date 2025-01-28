import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  point,
  real,
  smallint,
  timestamp,
  unique,
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
        // Enforced on the code level, you may not delete a role which has users
        // attached to it
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

const genreModel = pgTable('genre', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  name: varchar('name').unique().notNull(),
  ...timestamps,
});

const movieModel = pgTable(
  'movie',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    title: varchar('title').notNull(),
    description: varchar('description').notNull(),
    price: real('price').notNull(),
    genreId: uuid('genre_id')
      .references(
        () => {
          return genreModel.id;
        },
        { onDelete: 'cascade', onUpdate: 'cascade' },
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
      // 'no action' is used instead of 'cascade' since we need to delete
      // the actual file as well which is done manually
      { onDelete: 'no action', onUpdate: 'cascade' },
    ),
  absolutePath: varchar('absolute_path').notNull(),
  mimeType: varchar('mime_type').notNull(),
  sizeInBytes: integer('size_in_bytes').notNull(),
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
      mode: 'date',
      precision: 3,
      withTimezone: true,
    }).notNull(),
    reservations: point('reservations')
      .array()
      .default(sql`ARRAY[]::point[]`)
      .notNull(),
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
      unique('showtime_at').on(table.at, table.hallId),
      index('showtime_movie_index').using('btree', table.movieId.asc()),
      index('showtime_hall_index').using('btree', table.hallId.asc()),
      uniqueIndex('showtime_cursor_unique_index').using(
        'btree',
        table.id.asc(),
        table.createdAt.asc(),
      ),
    ];
  },
);

/**********************************************************************************/

// This table should be dumped to a summary table to prevent too many irrelevant
// entries
const usersShowtimesModel = pgTable(
  'user_showtime',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id')
      .references(
        () => {
          return userModel.id;
        },
        // We don' allow deleting a user with movie reservations. First you must
        // cancel his reservations and only when they have no reservations they
        // are allowed to be deleted (this logic is done on the code level)
        { onDelete: 'no action', onUpdate: 'cascade' },
      )
      .notNull(),
    showtimeId: uuid('showtime_id')
      .references(
        () => {
          return showtimeModel.id;
        },
        // When a showtime is deleted the users should be notified/refunded
        // before removing the entry for them (this logic is done on the code level)
        { onDelete: 'no action', onUpdate: 'cascade' },
      )
      .notNull(),
    ...timestamps,
  },
  (table) => {
    return [
      index('user_showtime_user_index').using('btree', table.userId.asc()),
      index('user_showtime_showtime_index').using(
        'btree',
        table.showtimeId.asc(),
      ),
      uniqueIndex('user_showtime_unique_index').using(
        'btree',
        table.showtimeId.asc(),
        table.userId.asc(),
      ),
    ];
  },
);

/**********************************************************************************/

export {
  genreModel,
  hallModel,
  movieModel,
  moviePosterModel,
  roleModel,
  showtimeModel,
  userModel,
  usersShowtimesModel,
};
