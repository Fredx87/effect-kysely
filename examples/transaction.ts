import * as S from "@effect/schema/Schema";
import SQLite from "better-sqlite3";
import { withCodec } from "effect-kysely/Query.js";
import { User, UserId, UserTable } from "./schemas/User.js";
import { TodoTable } from "./schemas/Todo.js";
import { Context, Effect, Logger } from "effect";
import { Kysely, SqliteDialect } from "kysely";
import { defaultLogger } from "effect/Logger";
import { createTempDb } from "./helpers/createTempDb.js";

interface DbTables {
  user: UserTable;
  todo: TodoTable;
}

class DbTag extends Context.Tag("DbTag")<DbTag, Kysely<DbTables>>() {}

const program = Effect.gen(function* (_) {
  const db = yield* _(DbTag);
  const insertUsers = withCodec({
    encoder: S.Tuple(User.Insertable, User.Insertable),
    decoder: S.Tuple(S.Struct({ id: UserId }), S.Struct({ id: UserId })),
    query: ([user1, user2]) =>
      db.transaction().execute(async (trx) => {
        const res1 = await trx
          .insertInto("user")
          .values(user1)
          .returning("id")
          .executeTakeFirstOrThrow();

        const res2 = await trx
          .insertInto("user")
          .values(user2)
          .returning("id")
          .executeTakeFirstOrThrow();

        return [res1, res2] as const;
      }),
  });

  const [{ id: user1_id }, { id: user2_id }] = yield* _(
    insertUsers([{ username: "user1" }, { username: "user2" }]),
  );

  yield* _(Effect.logInfo(`Inserted users with ids ${user1_id}, ${user2_id}`));

  // This will throw an error because the username is not unique
  yield* _(insertUsers([{ username: "user3" }, { username: "user1" }]));
});

const DbLive = new Kysely<DbTables>({
  dialect: new SqliteDialect({
    database: new SQLite(createTempDb()),
  }),
});

const LoggerLayer = Logger.replace(
  defaultLogger,
  Logger.make(({ message }) => console.log(message)),
);

const res = await Effect.runPromiseExit(
  program.pipe(
    Effect.provideService(DbTag, DbLive),
    Effect.provide(LoggerLayer),
  ),
);

console.log(res);

/*
Output:

Inserted users with ids 1, 2
{
  _id: 'Exit',
  _tag: 'Failure',
  cause: {
    _id: 'Cause',
    _tag: 'Fail',
    failure: {
      message: 'UNIQUE constraint failed: user.username',
      _tag: 'QueryError'
    }
  }
}
*/
