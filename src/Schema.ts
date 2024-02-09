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

export const GeneratedTypeId = Symbol.for("effect-kysely/GeneratedTypeId");

interface ColumnTypeSchemas<STo, SFrom, ITo, IFrom, UTo, UFrom> {
  selectSchema: S.Schema<STo, SFrom>;
  insertSchema: S.Schema<ITo, IFrom>;
  updateSchema: S.Schema<UTo, UFrom>;
}

export const columnType = <STo, SFrom, ITo, IFrom, UTo, UFrom>(
  selectSchema: S.Schema<STo, SFrom>,
  insertSchema: S.Schema<ITo, IFrom>,
  updateSchema: S.Schema<UTo, UFrom>,
): S.Schema<ColumnType<STo, ITo, UTo>, ColumnType<SFrom, IFrom, UFrom>> => {
  const schemas: ColumnTypeSchemas<STo, SFrom, ITo, IFrom, UTo, UFrom> = {
    selectSchema,
    insertSchema,
    updateSchema,
  };
  return S.make(AST.setAnnotation(S.never.ast, ColumnTypeId, schemas));
};

export const generated = <STo, SFrom>(
  schema: S.Schema<STo, SFrom>,
): S.Schema<Generated<STo>, Generated<SFrom>> =>
  columnType(schema, S.union(schema, S.undefined), schema);

export const selectable = <To, From>(
  schema: S.Schema<To, From>,
): S.Schema<Selectable<To>, Selectable<From>> => {
  return S.make(extractParametersFromAst(schema.ast, "selectSchema"));
};

export const insertable = <To, From>(
  schema: S.Schema<To, From>,
): S.Schema<Insertable<To>, Insertable<From>> => {
  const extracted = extractParametersFromAst(
    schema.ast,
    "insertSchema",
  ) as AST.TypeLiteral;
  const ast: AST.AST = {
    ...extracted,
    propertySignatures: extracted.propertySignatures.map((prop) => ({
      ...prop,
      type: prop.type,
      isOptional: isOptionalType(prop.type),
    })),
  };
  return S.make(ast);
};

export const updateable = <To, From>(
  schema: S.Schema<To, From>,
): S.Schema<Updateable<To>, Updateable<From>> => {
  const extracted = extractParametersFromAst(
    schema.ast,
    "updateSchema",
  ) as AST.TypeLiteral;
  const ast: AST.AST = {
    ...extracted,
    propertySignatures: extracted.propertySignatures.map((prop) => ({
      ...prop,
      type: AST.createUnion([prop.type, AST.undefinedKeyword]),
      isOptional: true,
    })),
  };
  return S.make(ast);
};

export interface Schemas<To, From> {
  Selectable: S.Schema<Selectable<To>, Selectable<From>>;
  Insertable: S.Schema<Insertable<To>, Insertable<From>>;
  Updateable: S.Schema<Updateable<To>, Updateable<From>>;
}

export const getSchemas = <To, From>(
  baseSchema: S.Schema<To, From>,
): Schemas<To, From> => ({
  Selectable: selectable(baseSchema),
  Insertable: insertable(baseSchema),
  Updateable: updateable(baseSchema),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface GetTypes<T extends Schemas<any, any>> {
  Selectable: S.Schema.To<T["Selectable"]>;
  Insertable: S.Schema.To<T["Insertable"]>;
  Updateable: S.Schema.To<T["Updateable"]>;
}

const extractParametersFromAst = (
  ast: AST.AST,
  schemaType: keyof ColumnTypeSchemas<any, any, any, any, any, any>,
): AST.AST => {
  if (!AST.isTypeLiteral(ast)) {
    return ast;
  }
  return {
    ...ast,
    propertySignatures: ast.propertySignatures
      .map((prop) => {
        if (!isColumnType(prop.type)) {
          return prop;
        }
        const schemas = prop.type.annotations[
          ColumnTypeId
        ] as ColumnTypeSchemas<any, any, any, any, any, any>;
        return { ...prop, type: schemas[schemaType].ast };
      })
      .filter((prop) => prop.type._tag !== "NeverKeyword"),
  };
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
