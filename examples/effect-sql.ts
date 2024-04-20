import { Config, Context, Effect, Logger } from "effect";
import {
  DummyDriver,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
} from "kysely";
import * as S from "@effect/schema/Schema";
import * as Sql from "@effect/sql-sqlite-node";
import { Todo, TodoId, TodoTable } from "./schemas/Todo.js";
import { User, UserId, UserTable } from "./schemas/User.js";
import { createQuery } from "effect-kysely/effect-sql.js";
import { defaultLogger } from "effect/Logger";
import { createTempDb } from "./helpers/createTempDb.js";

interface DbTables {
  user: UserTable;
  todo: TodoTable;
}

class DbTag extends Context.Tag("DbTag")<DbTag, Kysely<DbTables>>() {}

const program = Effect.gen(function* (_) {
  const db = yield* _(DbTag);
  const sql = yield* _(Sql.client.SqliteClient);

  const InsertUser = yield* _(
    Sql.resolver.ordered("InsertUser", {
      Request: User.Insertable,
      Result: S.Struct({ id: UserId }),
      execute: (user) =>
        createQuery(sql, db.insertInto("user").values(user).returning("id")),
    }),
  );

  const InsertTodo = yield* _(
    Sql.resolver.ordered("InsertTodo", {
      Request: Todo.Insertable,
      Result: S.Struct({ id: TodoId }),
      execute: (todo) =>
        createQuery(sql, db.insertInto("todo").values(todo).returning("id")),
    }),
  );

  const GetTodoById = yield* _(
    Sql.resolver.findById("GetTodoById", {
      Id: S.Number,
      Result: Todo.Selectable,
      ResultId: (_) => _.id,
      execute: (ids) =>
        createQuery(
          sql,
          db.selectFrom("todo").selectAll().where("id", "in", ids),
        ),
    }),
  );

  const [{ id: user1_id }, { id: user2_id }] = yield* _(
    Effect.all(
      [
        InsertUser.execute({ username: "user1" }),
        InsertUser.execute({ username: "user2" }),
      ],
      { batching: true },
    ),
  );

  yield* _(Effect.logInfo(`Inserted users with ids ${user1_id}, ${user2_id}`));

  const insertedTodos = yield* _(
    Effect.all(
      [
        InsertTodo.execute({
          content: "user1 todo1",
          completed: false,
          user_id: user1_id,
        }),
        InsertTodo.execute({
          content: "user1 todo2",
          completed: false,
          user_id: user1_id,
        }),
        InsertTodo.execute({
          content: "user1 todo3",
          completed: false,
          user_id: user1_id,
        }),
        InsertTodo.execute({
          content: "user2 todo1",
          completed: false,
          user_id: user2_id,
        }),
      ],
      { batching: true },
    ),
  );

  const todoIds = insertedTodos.map((t) => t.id);

  yield* _(Effect.logInfo(`Inserted todos with ids ${todoIds.join(", ")}`));

  const res = yield* _(
    Effect.all(todoIds.map(GetTodoById.execute), { batching: true }),
  );

  yield* _(
    Effect.logInfo(`Todos:\n ${res.map((t) => `${JSON.stringify(t)}\n`)}`),
  );
});

const DbLive = new Kysely<DbTables>({
  dialect: {
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new SqliteIntrospector(db),
    createQueryCompiler: () => new SqliteQueryCompiler(),
  },
});

const SqlLive = Sql.client.layer({
  filename: Config.succeed(createTempDb()),
});

const LoggerLayer = Logger.replace(
  defaultLogger,
  Logger.make(({ message }) => console.log(message)),
);

const res = await Effect.runPromiseExit(
  program.pipe(
    Effect.provideService(DbTag, DbLive),
    Effect.provide(SqlLive),
    Effect.provide(LoggerLayer),
  ),
);

console.log(res);

/*

Output:

Inserted users with ids 2, 1
Inserted todos with ids 4, 3, 2, 1
Todos:
 {"_id":"Option","_tag":"Some","value":{"id":4,"created_at":"2024-02-09T21:54:35.000Z","updated_at":"2024-02-09T21:54:35.000Z","content":"user1 todo1","user_id":2,"completed":false}}
,{"_id":"Option","_tag":"Some","value":{"id":3,"created_at":"2024-02-09T21:54:35.000Z","updated_at":"2024-02-09T21:54:35.000Z","content":"user1 todo2","user_id":2,"completed":false}}
,{"_id":"Option","_tag":"Some","value":{"id":2,"created_at":"2024-02-09T21:54:35.000Z","updated_at":"2024-02-09T21:54:35.000Z","content":"user1 todo3","user_id":2,"completed":false}}
,{"_id":"Option","_tag":"Some","value":{"id":1,"created_at":"2024-02-09T21:54:35.000Z","updated_at":"2024-02-09T21:54:35.000Z","content":"user2 todo1","user_id":1,"completed":false}}

{ _id: 'Exit', _tag: 'Success', value: undefined }
*/
