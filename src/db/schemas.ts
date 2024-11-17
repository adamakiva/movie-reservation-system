import {
  index,
  pgTable,
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

const userModel = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    firstName: varchar('first_name').notNull(),
    lastName: varchar('last_name').notNull(),
    email: varchar('email').unique().notNull(),
    hash: varchar('hash').notNull(),
    roleId: uuid('role_id').references(
      () => {
        return roleModel.id;
      },
      { onDelete: 'set null', onUpdate: 'cascade' },
    ),
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

const roleModel = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: varchar('name').notNull(),
    ...timestamps,
  },
  (table) => {
    return [{ nameIndex: index().using('btree', table.name) }];
  },
);

/**********************************************************************************/

export { roleModel, userModel };
