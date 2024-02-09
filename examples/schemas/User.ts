import * as S from "@effect/schema/Schema";
import { GetTypes, columnType, getSchemas } from "effect-kysely/Schema.js";

export const UserId = S.number.pipe(S.brand("UserId"));

const _User = S.struct({
  id: columnType(UserId, S.never, S.never),
  username: S.string,
  created_at: columnType(S.DateFromString, S.never, S.never),
  updated_at: columnType(S.DateFromString, S.never, S.never),
});

export type UserTable = S.Schema.From<typeof _User>;

export const User = getSchemas(_User);
export type User = GetTypes<typeof User>;
