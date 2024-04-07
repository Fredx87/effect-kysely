import * as S from "@effect/schema/Schema";
import { Effect, pipe } from "effect";
import { NoResultError } from "kysely";
import {
  DatabaseError,
  NotFoundError,
  QueryError,
  QueryParseError,
} from "./DatabaseError.js";

type QueryFn<I, O> = (input: I) => Promise<O>;

export const withEncoder =
  <IEncoded, IType, O>({
    encoder,
    query,
  }: {
    encoder: S.Schema<IType, IEncoded>;
    query: QueryFn<IEncoded, O>;
  }) =>
  (input: IType): Effect.Effect<O, DatabaseError> =>
    Effect.gen(function* ($) {
      const encoded = yield* $(encode(encoder, input));
      return yield* $(toEffect(query, encoded));
    });

export const withDecoder =
  <OEncoded, OType>({
    decoder,
    query,
  }: {
    decoder: S.Schema<OType, OEncoded>;
    query: QueryFn<undefined, OEncoded>;
  }) =>
  (): Effect.Effect<OType, DatabaseError> =>
    Effect.gen(function* ($) {
      const res = yield* $(toEffect(query, undefined));
      return yield* $(decode(decoder, res));
    });

export const withCodec =
  <IEncoded, IType, OEncoded, OType>({
    encoder,
    decoder,
    query,
  }: {
    encoder: S.Schema<IType, IEncoded>;
    decoder: S.Schema<OType, OEncoded>;
    query: QueryFn<IEncoded, OEncoded>;
  }) =>
  (input: IType): Effect.Effect<OType, DatabaseError> =>
    Effect.gen(function* ($) {
      const encoded = yield* $(encode(encoder, input));
      const res = yield* $(toEffect(query, encoded));
      return yield* $(decode(decoder, res));
    });

const toEffect = <I, O>(query: QueryFn<I, O>, input: I) =>
  Effect.tryPromise({
    try: () => query(input),
    catch: (error) => {
      if (error instanceof NoResultError) {
        return new NotFoundError();
      }

      if (error instanceof Error) {
        return new QueryError({ message: error.message });
      }

      return new QueryError({ message: String(error) });
    },
  });

const encode = <IEncoded, IType>(
  inputSchema: S.Schema<IType, IEncoded>,
  input: IType,
) =>
  pipe(
    input,
    S.encode(inputSchema),
    Effect.mapError((parseError) => new QueryParseError({ parseError })),
  );

const decode = <OEncoded, OType>(
  outputSchema: S.Schema<OType, OEncoded>,
  encoded: OEncoded,
) =>
  pipe(
    encoded,
    S.decode(outputSchema),
    Effect.mapError((parseError) => new QueryParseError({ parseError })),
  );
