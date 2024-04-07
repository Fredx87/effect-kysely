import * as S from "@effect/schema/Schema";
import * as AST from "@effect/schema/AST";
import { describe, test, expect, assert } from "vitest";
import { columnType, insertable, selectable, updateable } from "./Schema.js";

describe("Schema", () => {
  describe("columnType", () => {
    const _TodoTable = S.struct({
      id: columnType(
        S.NumberFromString,
        S.union(S.number, S.undefined),
        S.number,
      ),
      name: S.string,
    });

    test("cannot use schema directly", () => {
      const decode = S.decodeEither(_TodoTable)({
        id: "1",
        name: "foo",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      expect(decode._tag).toEqual("Left");
    });

    test("selectable", () => {
      const ast = selectable(_TodoTable).ast;

      assert(AST.isTypeLiteral(ast));

      assert.equal(ast.propertySignatures.length, 2);

      const idProp = ast.propertySignatures.find((p) => p.name === "id");
      assert.isNotNull(idProp);
      assert(AST.isTransform(idProp!.type));
      assert.equal(idProp!.type.from._tag, "StringKeyword");
      assert.equal(idProp!.type.to._tag, "NumberKeyword");

      const nameProp = ast.propertySignatures.find((p) => p.name === "name");
      assert.isNotNull(nameProp);
      assert.equal(nameProp!.type._tag, "StringKeyword");
    });

    test("insertable", () => {
      const ast = insertable(_TodoTable).ast;
      assert(AST.isTypeLiteral(ast));

      assert.equal(ast.propertySignatures.length, 2);

      const idProp = ast.propertySignatures.find((p) => p.name === "id");
      assert.isNotNull(idProp);
      assert.equal(idProp!.isOptional, true);
      assert(AST.isUnion(idProp!.type));
      assert.equal(idProp!.type.types.length, 2);
      assert.equal(idProp!.type.types[0]._tag, "NumberKeyword");
      assert.equal(idProp!.type.types[1]._tag, "UndefinedKeyword");

      const nameProp = ast.propertySignatures.find((p) => p.name === "name");
      assert.isNotNull(nameProp);
      assert.equal(nameProp!.type._tag, "StringKeyword");
    });

    test("updateable", () => {
      const ast = updateable(_TodoTable).ast;

      assert(AST.isTypeLiteral(ast));

      assert.equal(ast.propertySignatures.length, 2);

      const idProp = ast.propertySignatures.find((p) => p.name === "id");
      assert.isNotNull(idProp);
      assert.equal(idProp!.isOptional, true);
      assert(AST.isUnion(idProp!.type));
      assert.equal(idProp!.type.types.length, 2);
      assert.equal(idProp!.type.types[0]._tag, "NumberKeyword");
      assert.equal(idProp!.type.types[1]._tag, "UndefinedKeyword");

      const nameProp = ast.propertySignatures.find((p) => p.name === "name");
      assert.isNotNull(nameProp);
      assert.equal(nameProp!.isOptional, true);
      assert(AST.isUnion(nameProp!.type));
      assert.equal(nameProp!.type.types.length, 2);
      assert.equal(nameProp!.type.types[0]._tag, "StringKeyword");
      assert.equal(nameProp!.type.types[1]._tag, "UndefinedKeyword");
    });
  });
});
