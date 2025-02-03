import {
  foreignKey,
  integer,
  pgTable,
  real,
  smallint,
  timestamp,
  unique,
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

const roleModel = pgTable('role', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  name: varchar('name').unique('role_unique_constraint').notNull(),
  ...timestamps,
});

const userModel = pgTable(
  'user',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    firstName: varchar('first_name').notNull(),
    lastName: varchar('last_name').notNull(),
    email: varchar('email').unique('user_unique_constraint').notNull(),
    hash: varchar('hash').notNull(),
    roleId: uuid('role_id').notNull(),
    ...timestamps,
  },
  (table) => {
    return [
      foreignKey({
        columns: [table.roleId],
        foreignColumns: [roleModel.id],
        name: 'user_role_id_fk',
      })
        .onDelete('cascade')
        .onUpdate('cascade'),
    ];
  },
);

/**********************************************************************************/

const genreModel = pgTable('genre', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  name: varchar('name').unique('genre_unique_constraint').notNull(),
  ...timestamps,
});

const movieModel = pgTable(
  'movie',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    title: varchar('title').notNull(),
    description: varchar('description').notNull(),
    price: real('price').notNull(),
    genreId: uuid('genre_id').notNull(),
    ...timestamps,
  },
  (table) => {
    return [
      foreignKey({
        columns: [table.genreId],
        foreignColumns: [genreModel.id],
        name: 'movie_genre_id_fk',
      })
        .onDelete('cascade')
        .onUpdate('cascade'),
    ];
  },
);

const moviePosterModel = pgTable(
  'movie_poster',
  {
    movieId: uuid('movie_id').primaryKey(),
    absolutePath: varchar('absolute_path').notNull(),
    mimeType: varchar('mime_type').notNull(),
    sizeInBytes: integer('size_in_bytes').notNull(),
    ...timestamps,
  },
  (table) => {
    return [
      foreignKey({
        columns: [table.movieId],
        foreignColumns: [movieModel.id],
        name: 'movie_poster_movie_id_fk',
      })
        // 'no action' is used instead of 'cascade' since we need to delete
        // the actual file as well which is done manually
        .onDelete('no action')
        .onUpdate('cascade'),
    ];
  },
);

const hallModel = pgTable('hall', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  name: varchar('name').unique('hall_unique_constraint').notNull(),
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
    movieId: uuid('movie_id').notNull(),
    hallId: uuid('hall_id').notNull(),
    ...timestamps,
  },
  (table) => {
    return [
      foreignKey({
        columns: [table.movieId],
        foreignColumns: [movieModel.id],
        name: 'showtime_movie_id_fk',
      })
        .onDelete('cascade')
        .onUpdate('cascade'),
      foreignKey({
        columns: [table.hallId],
        foreignColumns: [hallModel.id],
        name: 'showtime_hall_id_fk',
      })
        .onDelete('cascade')
        .onUpdate('cascade'),
      unique('showtime_unique_constraint').on(table.at, table.hallId),
    ];
  },
);

/**********************************************************************************/

// This table should be dumped to a summary table after the showtime has passed
const usersShowtimesModel = pgTable(
  'user_showtime',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    row: smallint('row').notNull(),
    column: smallint('column').notNull(),
    userId: uuid('user_id').notNull(),
    showtimeId: uuid('showtime_id').notNull(),
    ...timestamps,
  },
  (table) => {
    return [
      foreignKey({
        columns: [table.userId],
        foreignColumns: [userModel.id],
        name: 'user_showtime_user_id_fk',
      })
        .onDelete('cascade')
        .onUpdate('cascade'),
      foreignKey({
        columns: [table.showtimeId],
        foreignColumns: [showtimeModel.id],
        name: 'user_showtime_showtime_id_fk',
      })
        .onDelete('cascade')
        .onUpdate('cascade'),
      unique('user_showtime_unique_constraint').on(
        table.row,
        table.column,
        table.showtimeId,
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
