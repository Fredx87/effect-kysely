/* eslint-disable @typescript-eslint/no-explicit-any */
import * as AST from "@effect/schema/AST";
import * as S from "@effect/schema/Schema";
import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export const ColumnTypeId = Symbol.for("effect-kysely/ColumnTypeId");

interface ColumnTypeSchemas<SType, SEncoded, IType, IEncoded, UType, UEncoded> {
  selectSchema: S.Schema<SType, SEncoded>;
  insertSchema: S.Schema<IType, IEncoded>;
  updateSchema: S.Schema<UType, UEncoded>;
}

export const columnType = <SType, SEncoded, IType, IEncoded, UType, UEncoded>(
  selectSchema: S.Schema<SType, SEncoded>,
  insertSchema: S.Schema<IType, IEncoded>,
  updateSchema: S.Schema<UType, UEncoded>,
): S.Schema<
  ColumnType<SType, IType, UType>,
  ColumnType<SEncoded, IEncoded, UEncoded>
> => {
  const schemas: ColumnTypeSchemas<
    SType,
    SEncoded,
    IType,
    IEncoded,
    UType,
    UEncoded
  > = {
    selectSchema,
    insertSchema,
    updateSchema,
  };
  return S.make(AST.annotations(S.never.ast, { [ColumnTypeId]: schemas }));
};

export const generated = <SType, SEncoded>(
  schema: S.Schema<SType, SEncoded>,
): S.Schema<Generated<SType>, Generated<SEncoded>> =>
  columnType(schema, S.union(schema, S.undefined), schema);

export const selectable = <Type, Encoded>({
  ast,
}: S.Schema<Type, Encoded>): S.Schema<
  Selectable<Type>,
  Selectable<Encoded>
> => {
  if (!AST.isTypeLiteral(ast)) {
    return S.make(ast);
  }
  return S.make(
    new AST.TypeLiteral(
      extractParametersFromTypeLiteral(ast, "selectSchema"),
      ast.indexSignatures,
      ast.annotations,
    ),
  );
};

export const insertable = <Type, Encoded>({
  ast,
}: S.Schema<Type, Encoded>): S.Schema<
  Insertable<Type>,
  Insertable<Encoded>
> => {
  if (!AST.isTypeLiteral(ast)) {
    return S.make(ast);
  }

  const extracted = extractParametersFromTypeLiteral(ast, "insertSchema");

  const res = new AST.TypeLiteral(
    extracted.map(
      (prop) =>
        new AST.PropertySignature(
          prop.name,
          prop.type,
          isOptionalType(prop.type),
          prop.isReadonly,
          prop.annotations,
        ),
    ),
    ast.indexSignatures,
    ast.annotations,
  );
  return S.make(res);
};

export const updateable = <Type, Encoded>({
  ast,
}: S.Schema<Type, Encoded>): S.Schema<
  Updateable<Type>,
  Updateable<Encoded>
> => {
  if (!AST.isTypeLiteral(ast)) {
    return S.make(ast);
  }

  const extracted = extractParametersFromTypeLiteral(ast, "updateSchema");

  const res = new AST.TypeLiteral(
    extracted.map(
      (prop) =>
        new AST.PropertySignature(
          prop.name,
          AST.Union.make([prop.type, new AST.UndefinedKeyword()]),
          true,
          prop.isReadonly,
          prop.annotations,
        ),
    ),
    ast.indexSignatures,
    ast.annotations,
  );

  return S.make(res);
};

export interface Schemas<Type, Encoded> {
  Selectable: S.Schema<Selectable<Type>, Selectable<Encoded>>;
  Insertable: S.Schema<Insertable<Type>, Insertable<Encoded>>;
  Updateable: S.Schema<Updateable<Type>, Updateable<Encoded>>;
}

export const getSchemas = <Type, Encoded>(
  baseSchema: S.Schema<Type, Encoded>,
): Schemas<Type, Encoded> => ({
  Selectable: selectable(baseSchema),
  Insertable: insertable(baseSchema),
  Updateable: updateable(baseSchema),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface GetTypes<T extends Schemas<any, any>> {
  Selectable: S.Schema.Type<T["Selectable"]>;
  Insertable: S.Schema.Type<T["Insertable"]>;
  Updateable: S.Schema.Type<T["Updateable"]>;
}

const extractParametersFromTypeLiteral = (
  ast: AST.TypeLiteral,
  schemaType: keyof ColumnTypeSchemas<any, any, any, any, any, any>,
): AST.PropertySignature[] => {
  return ast.propertySignatures
    .map((prop) => {
      if (!isColumnType(prop.type)) {
        return prop;
      }
      const schemas = prop.type.annotations[ColumnTypeId] as ColumnTypeSchemas<
        any,
        any,
        any,
        any,
        any,
        any
      >;
      return new AST.PropertySignature(
        prop.name,
        schemas[schemaType].ast,
        prop.isOptional,
        prop.isReadonly,
        prop.annotations,
      );
    })
    .filter((prop) => prop.type._tag !== "NeverKeyword");
};

const isColumnType = (ast: AST.AST): ast is AST.Declaration =>
  ColumnTypeId in ast.annotations;

const isOptionalType = (ast: AST.AST): boolean => {
  if (!AST.isUnion(ast)) {
    return false;
  }

  return (
    ast.types.find((t) => AST.isUndefinedKeyword(t)) !== undefined ||
    ast.types.find((t) => isNullType(t)) !== undefined
  );
};

const isNullType = (ast: AST.AST) =>
  AST.isLiteral(ast) &&
  Object.entries(ast.annotations).find(
    ([sym, value]) =>
      sym === AST.IdentifierAnnotationId.toString() && value === "null",
  );
