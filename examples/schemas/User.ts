import * as S from "@effect/schema/Schema";
import { GetTypes, columnType, getSchemas } from "effect-kysely/Schema.js";

export const UserId = S.Number.pipe(S.brand("UserId"));

const _User = S.Struct({
  id: columnType(UserId, S.Never, S.Never),
  username: S.String,
  created_at: columnType(S.DateFromString, S.Never, S.Never),
  updated_at: columnType(S.DateFromString, S.Never, S.Never),
});

export type UserTable = S.Schema.Encoded<typeof _User>;

export const User = getSchemas(_User);
export type User = GetTypes<typeof User>;
