import { ParseError } from "@effect/schema/ParseResult";
import { Data } from "effect";

export class QueryParseError extends Data.TaggedError("QueryParseError")<{
  parseError: ParseError;
}> {}

export class QueryError extends Data.TaggedError("QueryError")<{
  message: string;
}> {}

export class NotFoundError extends Data.TaggedError("NotFoundError") {}

export type DatabaseError = QueryParseError | QueryError | NotFoundError;
