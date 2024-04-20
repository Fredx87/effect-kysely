import * as S from "@effect/schema/Schema";
import SQLite from "better-sqlite3";
import { withCodec, withEncoder, withDecoder } from "effect-kysely/Query.js";
import { User, UserId, UserTable } from "./schemas/User.js";
import { Todo, TodoId, TodoTable } from "./schemas/Todo.js";
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

  const insertUser = withCodec({
    encoder: User.Insertable,
    decoder: S.Struct({ id: UserId }),
    query: (user) =>
      db
        .insertInto("user")
        .values(user)
        .returning("id")
        .executeTakeFirstOrThrow(),
  });

  const insertTodo = withCodec({
    encoder: Todo.Insertable,
    decoder: S.Struct({ id: TodoId }),
    query: (todo) =>
      db
        .insertInto("todo")
        .values(todo)
        .returning("id")
        .executeTakeFirstOrThrow(),
  });

  const updateAllUserTodos = withEncoder({
    encoder: S.Struct({ userId: UserId, todo: Todo.Updateable }),
    query: ({ userId, todo }) =>
      db
        .updateTable("todo")
        .set(todo)
        .where("user_id", "=", userId)
        .executeTakeFirst(),
  });

  const selectAllTodosWithUsername = withDecoder({
    decoder: S.Array(
      Todo.Selectable.pipe(
        S.omit("user_id"),
        S.extend(User.Selectable.pipe(S.pick("username"))),
      ),
    ),
    query: () =>
      db
        .selectFrom("todo")
        .innerJoin("user", "user.id", "todo.user_id")
        .select([
          "todo.id",
          "todo.content",
          "todo.completed",
          "todo.created_at",
          "todo.updated_at",
          "user.username",
        ])
        .execute(),
  });

  const { id: user1_id } = yield* _(insertUser({ username: "user1" }));
  yield* _(Effect.logInfo(`Inserted user with id ${user1_id}`));

  const { id: user2_id } = yield* _(insertUser({ username: "user2" }));
  yield* _(Effect.logInfo(`Inserted user with id ${user2_id}`));

  const { id: todo1_id } = yield* _(
    insertTodo({
      content: "user1 todo1",
      completed: false,
      user_id: user1_id,
    }),
  );
  yield* _(Effect.logInfo(`Inserted todo with id ${todo1_id}`));

  const { id: todo2_id } = yield* _(
    insertTodo({
      content: "user1 todo2",
      completed: false,
      user_id: user1_id,
    }),
  );
  yield* _(Effect.logInfo(`Inserted todo with id ${todo2_id}`));

  const { id: todo3_id } = yield* _(
    insertTodo({
      content: "user1 todo3",
      completed: false,
      user_id: user1_id,
    }),
  );
  yield* _(Effect.logInfo(`Inserted todo with id ${todo3_id}`));

  const { id: todo4_id } = yield* _(
    insertTodo({
      content: "user2 todo1",
      completed: false,
      user_id: user2_id,
    }),
  );
  yield* _(Effect.logInfo(`Inserted todo with id ${todo4_id}`));

  const res = yield* _(selectAllTodosWithUsername());
  yield* _(
    Effect.logInfo(`Todos:\n ${res.map((t) => `${JSON.stringify(t)}\n`)}`),
  );

  const { numUpdatedRows } = yield* _(
    updateAllUserTodos({
      userId: user1_id,
      todo: { completed: true, updated_at: new Date() },
    }),
  );
  yield* _(Effect.logInfo(`Updated ${numUpdatedRows} rows`));

  const res2 = yield* _(selectAllTodosWithUsername());
  yield* _(
    Effect.logInfo(`Todos:\n ${res2.map((t) => `${JSON.stringify(t)}\n`)}`),
  );
});

const db = new Kysely<DbTables>({
  dialect: new SqliteDialect({
    database: new SQLite(createTempDb()),
  }),
});

const LoggerLayer = Logger.replace(
  defaultLogger,
  Logger.make(({ message }) => console.log(message)),
);

const res = await Effect.runPromiseExit(
  program.pipe(Effect.provideService(DbTag, db), Effect.provide(LoggerLayer)),
);

console.log(res._tag);

/* 
Output:

Inserted user with id 1
Inserted user with id 2
Inserted todo with id 1
Inserted todo with id 2
Inserted todo with id 3
Inserted todo with id 4
Todos:
 {"id":1,"content":"user1 todo1","username":"user1","created_at":"2024-02-09T21:52:23.000Z","updated_at":"2024-02-09T21:52:23.000Z","completed":false}
,{"id":2,"content":"user1 todo2","username":"user1","created_at":"2024-02-09T21:52:23.000Z","updated_at":"2024-02-09T21:52:23.000Z","completed":false}
,{"id":3,"content":"user1 todo3","username":"user1","created_at":"2024-02-09T21:52:23.000Z","updated_at":"2024-02-09T21:52:23.000Z","completed":false}
,{"id":4,"content":"user2 todo1","username":"user2","created_at":"2024-02-09T21:52:23.000Z","updated_at":"2024-02-09T21:52:23.000Z","completed":false}

Updated 3 rows
Todos:
 {"id":1,"content":"user1 todo1","username":"user1","created_at":"2024-02-09T21:52:23.000Z","updated_at":"2024-02-09T22:52:23.267Z","completed":true}
,{"id":2,"content":"user1 todo2","username":"user1","created_at":"2024-02-09T21:52:23.000Z","updated_at":"2024-02-09T22:52:23.267Z","completed":true}
,{"id":3,"content":"user1 todo3","username":"user1","created_at":"2024-02-09T21:52:23.000Z","updated_at":"2024-02-09T22:52:23.267Z","completed":true}
,{"id":4,"content":"user2 todo1","username":"user2","created_at":"2024-02-09T21:52:23.000Z","updated_at":"2024-02-09T21:52:23.000Z","completed":false}

Success
*/
