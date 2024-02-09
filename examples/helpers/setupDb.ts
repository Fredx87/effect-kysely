import { Kysely, SqliteDialect, sql } from "kysely";
import SQLite from "better-sqlite3";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new Kysely<any>({
  dialect: new SqliteDialect({
    database: new SQLite(
      new URL("../db/example.sqlite", import.meta.url).pathname,
    ),
  }),
});

await db.schema
  .createTable("user")
  .addColumn("id", "integer", (col) => col.primaryKey())
  .addColumn("username", "text", (col) => col.notNull().unique())
  .addColumn("created_at", "text", (col) =>
    col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
  )
  .addColumn("updated_at", "text", (col) =>
    col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
  )
  .execute();

await db.schema
  .createTable("todo")
  .addColumn("id", "integer", (col) => col.primaryKey())
  .addColumn("content", "text", (col) => col.notNull())
  .addColumn("completed", "boolean", (col) => col.notNull())
  .addColumn("user_id", "integer", (col) =>
    col.references("user.id").onDelete("cascade").notNull(),
  )
  .addColumn("created_at", "text", (col) =>
    col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
  )
  .addColumn("updated_at", "text", (col) =>
    col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
  )
  .execute();
