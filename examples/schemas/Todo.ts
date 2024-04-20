import * as S from "@effect/schema/Schema";
import { GetTypes, columnType, getSchemas } from "effect-kysely/Schema.js";
import { UserId } from "./User.js";

export const TodoId = S.Number.pipe(S.brand("TodoId"));

const BooleanFromNumber = S.transform(S.Number, S.Boolean, {
  decode: (n) => (n === 1 ? true : false),
  encode: (b) => (b ? 1 : 0),
});

const _Todo = S.Struct({
  id: columnType(TodoId, S.Never, S.Never),
  content: S.String,
  completed: BooleanFromNumber,
  user_id: UserId,
  created_at: columnType(S.DateFromString, S.Never, S.Never),
  updated_at: columnType(S.DateFromString, S.Never, S.DateFromString),
});

export type TodoTable = S.Schema.Encoded<typeof _Todo>;

export const Todo = getSchemas(_Todo);
export type Todo = GetTypes<typeof Todo>;
