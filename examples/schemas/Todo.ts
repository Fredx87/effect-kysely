import * as S from "@effect/schema/Schema";
import { GetTypes, columnType, getSchemas } from "effect-kysely/Schema.js";
import { UserId } from "./User.js";

export const TodoId = S.number.pipe(S.brand("TodoId"));

const BooleanFromNumber = S.transform(
  S.number,
  S.boolean,
  (n) => (n === 1 ? true : false),
  (b) => (b ? 1 : 0),
);

const _Todo = S.struct({
  id: columnType(TodoId, S.never, S.never),
  content: S.string,
  completed: BooleanFromNumber,
  user_id: UserId,
  created_at: columnType(S.DateFromString, S.never, S.never),
  updated_at: columnType(S.DateFromString, S.never, S.DateFromString),
});

export type TodoTable = S.Schema.Encoded<typeof _Todo>;

export const Todo = getSchemas(_Todo);
export type Todo = GetTypes<typeof Todo>;
