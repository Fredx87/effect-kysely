/* eslint-disable @typescript-eslint/no-explicit-any */
import { Compilable, InferResult } from "kysely";
import { Client } from "@sqlfx/sql/Client";
import { Primitive } from "@sqlfx/sql/Statement";

type InferResultType<C extends Compilable<any>> =
  InferResult<C> extends any[] ? InferResult<C>[number] : InferResult<C>;

export const createQuery = <C extends Compilable<any>>(
  client: Client,
  query: C,
) => {
  const { sql, parameters } = query.compile();
  return client.unsafe<InferResultType<C>>(
    sql,
    parameters as readonly Primitive[],
  );
};
