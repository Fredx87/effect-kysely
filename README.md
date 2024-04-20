# effect-kysely

Integrate [kysely](https://kysely.dev/) with [effect](https://www.effect.website/). Define your database tables with `@effect/schema` and use `effect-kysely` to query them with encoding and decoding support, or just use `kysely` as a query builder for [@effect/sql](https://github.com/Effect-TS/effect/tree/main/packages/sql).

⚠️ **Warning: This library is still in development and the API is subject to change.**

This library is currently published only as an ES module.

## Getting started

Install `effect-kysely`

```sh
npm install effect-kysely
```

```sh
yarn add effect-kysely
```

```sh
pnpm add effect-kysely
```

Install all peer dependencies if not already installed

```sh
npm install kysely effect @effect/schema
```

```sh
yarn add kysely effect @effect/schema
```

```sh
pnpm add kysely effect @effect/schema
```

## Define your database tables

`effect-kysely` provides some utility functions to define your database tables with `@effect/schema`. As in kysely, you can define a schema specifying a different type for select, insert, and update operations.

```ts
import * as S from "@effect/schema/Schema";
import { columnType } from "effect-kysely/Schema.js";

export const TodoId = S.Number.pipe(S.brand("TodoId"));

const BooleanFromNumber = S.transform(S.Number, S.Boolean, {
  decode: (n) => (n === 1 ? true : false),
  encode: (b) => (b ? 1 : 0),
});

const _Todo = S.struct({
  // as in kysely, you can define a schema specifying a different type for select, insert, and update operations
  id: columnType(TodoId, S.Never, S.Never),
  content: S.String,
  completed: BooleanFromNumber,
  user_id: UserId,
  created_at: columnType(S.DateFromString, S.Never, S.Never),
  updated_at: columnType(S.DateFromString, S.Never, S.DateFromString),
});
```

At the moment, `effect-kysely` provides only the `columnType` and `generated` functions to define different schemas for a column. They have the same meaning as in kysely.

**Note:** A schema that uses these helpers is not meant to be used directly, but it can be used to derive different schemas for select, insert and update operations.
If you try to decode/encode something with this schema, you will get an error.

### Derive a static type to be used with kysely

You can derive a static type to be used with kysely from a schema using the `S.Schema.Encoded` utility. The schema can be used to decode _from_ the database and encode data _to_ the database, so the type used with kysely is the the schema `Encoded` type.

```ts
/*
type TodoTable = {
    readonly id: ColumnType<number, never, never>;
    readonly content: string;
    readonly completed: number;
    readonly user_id: number;
    readonly created_at: ColumnType<string, never, never>;
    readonly updated_at: ColumnType<string, never, string>;
}
*/
type TodoTable = S.Schema.Encoded<typeof _Todo>;
```

### Derive select, insert and update schemas

You can derive the select, insert and update schemas from a schema using the `getSchemas` function. It returns an object with the `Selectable`, `Insertable`, and `Updateable` schemas.

```ts
import { getSchemas } from "effect-kysely/Schema.js";

/*
Todo.Selectable has id, content, completed, user_id, created_at, updated_at
Todo.Insertable has content, completed, user_id
Todo.Updateable has content, completed, user_id, updated_at
*/
const Todo = getSchemas(_Todo);
```

You can also derive static types for the different schemas using the `GetTypes` utility.

```ts
import { GetTypes } from "effect-kysely/Schema.js";

/*
Todo["Selectable"] = S.Schema.Type<Todo.Selectable>
Todo["Insertable"] = S.Schema.Type<Todo.Insertable>
Todo["Updateable"] = S.Schema.Type<Todo.Updateable>
*/
type Todo = GetTypes<typeof Todo>;
```

### Define database tables and database service

Define your database tables to be used with kysely and a tag to be used as an effect service:

```ts
import { Context } from "effect";

interface DbTables {
  todo: TodoTable;
}

class DbTag extends Context.Tag("DbTag")<DbTag, Kysely<DbTables>>() {}
```

## Query your database with kysely

You can now create queries using `effect-kysely`, with encoding and decoding support.

### withEncoder

If you need to create a query encoding some data, you can use the `withEncoder` function:

```ts
import { Effect } from "effect";
import { withEncoder } from "effect-kysely/Query.js";

const program = Effect.gen(function* (_) {
  const db = yield* _(DbTag);

  const insertQuery = withEncoder({
    encoder: Todo.Insertable,
    query: (todo) => db.insertInto("todo").values(todo).executeTakeFirstOrThrow(),
  });

  const result = yield* _(insertQuery({ content: "Buy milk", completed: false, user_id: 1 }));

  return result;
});

const DbLive = new Kysely<DbTables>({ dialect: ... });

const runnable = program.pipe(Effect.provideService(DbTag, DbLive));
```

The value passed to the `insertQuery` function will be encoded using the `Todo.Insertable` schema (in this example, completed is encoded as a number). Kysely will type-check that the encoded value passed to the query is compatible with the `Insertable` static type defined for the table.

In this case, `result` will be an `InsertResult` type from `kysely`, and we are not interested in decoding it.

### withDecoder

If you need to create a query decoding the result, you can use the `withDecoder` function:

```ts
const selectAllTodos = withDecoder({
  decoder: S.Array(Todo.Selectable),
  query: () => db.selectFrom("todo").selectAll().execute(),
});

const todos = yield * _(selectAllTodos());
```

In this case, the query does not take any parameter and we don't need an encoder. The result of the query will be decoded using the provided `decoder` schema (`id` is decoded as `TodoId`, `completed` is decoded as a boolean, `created_at` and `updated_at` are decoded as dates). Kysely generates a type for the result of the query, and `withDecoder` checks that the input schema of the decoder is compatible with the query result.

### withCodec

If you need to create a query encoding some data and decoding the result, you can use the `withCodec` function:

```ts
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

const { id } =
  yield * _(insertTodo({ content: "Buy milk", completed: false, user_id: 1 }));
```

### Errors

The effect returned by a query execution can fail with different errors:

- `QueryParseError`, if the encoding or decoding fails
- `QueryError`, if the query execution fails. It contains the error message returned by Kysely.
- `NotFoundError`, if you used `executeTakeFirstOrThrow()` and the query execution returns no result

### Transactions

`effect-kysely` doesn't provide a specific way to handle transactions. Since the query passed to `withEncoder`, `withDecoder` or `withCodec` is just a function that returns a Promise, you can write a query with a transaction using the method provided by Kysely.

```ts
const insertTodos = withEncoder({
  encoder: S.Tuple(Todo.Insertable, Todo.Insertable),
  query: ([todo1, todo2]) =>
    db.transaction().execute(async (trx) => {
      await trx.insertInto("todo").values(todo1).executeTakeFirstOrThrow();

      await trx.insertInto("todo").values(todo2).executeTakeFirstOrThrow();
    }),
});
```

## Use kysely as a query builder for @effect/sql

You need to:

- Define your database tables as described above
- create a `@effect/sql` client
- create a [cold Kysely instance](https://kysely.dev/docs/recipes/splitting-query-building-and-execution#cold-kysely-instances)

At this point you can use `createQuery` from `effect-kysely/effect-sql.js` to create a query using `kysely` as a query builder,
passing the `@effect/sql` client and a compilable `kysely` query.

```ts
import { Config, Context, Effect } from "effect";
import {
  DummyDriver,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
} from "kysely";
import * as Sql from "@effect/sql-sqlite-node";
import { createQuery } from "effect-kysely/effect-sql.js";

const program = Effect.gen(function* (_) {
  const db = yield* _(DbTag);
  const sql = yield* _(Sql.client.SqliteClient);

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

  const insertedTodos = yield* _(
    Effect.all(
      [
        InsertTodo.execute({
          content: "user1 todo1",
          completed: false,
          user_id: 1,
        }),
        InsertTodo.execute({
          content: "user2 todo1",
          completed: false,
          user_id: 2,
        }),
      ],
      { batching: true },
    ),
  );

  const todoIds = insertedTodos.map((t) => t.id);

  const res = yield* _(
    Effect.all(todoIds.map(GetTodoById.execute), { batching: true }),
  );

  return res;
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

const runnable = program.pipe(
  Effect.provideService(DbTag, DbLive),
  Effect.provide(SqlLive),
);
```

## FAQ

### What is the difference between using only this library and using it with `@effect/sql`?

If you use only `effect-kysely`:

- You can use any database that has a [Kysely dialect](https://kysely.dev/docs/dialects) available
- There is no support for batching and caching

If you use `effect-kysely` with `@effect/sql`:

- You can use batching and caching
- You can use only the databases supported by `@effect/sql`

## Examples

You can find more examples in the `examples` folder.

## License

MIT
