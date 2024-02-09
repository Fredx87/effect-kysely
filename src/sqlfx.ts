/* eslint-disable @typescript-eslint/no-explicit-any */
import { Compilable } from "kysely";
import { Client } from "@sqlfx/sql/Client";
import { Primitive } from "@sqlfx/sql/Statement";

export const createQuery = <A>(client: Client, query: Compilable<A>) => {
  const { sql, parameters } = query.compile();
  return client.unsafe(sql, parameters as readonly Primitive[]);
};
