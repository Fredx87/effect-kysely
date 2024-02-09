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
  <IFrom, ITo, O>({
    encoder,
    query,
  }: {
    encoder: S.Schema<ITo, IFrom>;
    query: QueryFn<IFrom, O>;
  }) =>
  (input: ITo): Effect.Effect<O, DatabaseError> =>
    Effect.gen(function* ($) {
      const encoded = yield* $(encode(encoder, input));
      return yield* $(toEffect(query, encoded));
    });

export const withDecoder =
  <OFrom, OTo>({
    decoder,
    query,
  }: {
    decoder: S.Schema<OTo, OFrom>;
    query: QueryFn<undefined, OFrom>;
  }) =>
  (): Effect.Effect<OTo, DatabaseError> =>
    Effect.gen(function* ($) {
      const res = yield* $(toEffect(query, undefined));
      return yield* $(decode(decoder, res));
    });

export const withCodec =
  <IFrom, ITo, OFrom, OTo>({
    encoder,
    decoder,
    query,
  }: {
    encoder: S.Schema<ITo, IFrom>;
    decoder: S.Schema<OTo, OFrom>;
    query: QueryFn<IFrom, OFrom>;
  }) =>
  (input: ITo): Effect.Effect<OTo, DatabaseError> =>
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

const encode = <IFrom, ITo>(input: S.Schema<ITo, IFrom>, iTo: ITo) =>
  pipe(
    iTo,
    S.encode(input),
    Effect.mapError((parseError) => new QueryParseError({ parseError })),
  );

const decode = <OFrom, OTo>(output: S.Schema<OTo, OFrom>, oFrom: OFrom) =>
  pipe(
    oFrom,
    S.decode(output),
    Effect.mapError((parseError) => new QueryParseError({ parseError })),
  );
