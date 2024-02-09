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

      assert.equal(ast.propertySignatures[0].name, "id");

      assert(AST.isTransform(ast.propertySignatures[0].type));
      assert.equal(ast.propertySignatures[0].type.from._tag, "StringKeyword");
      assert.equal(ast.propertySignatures[0].type.to._tag, "NumberKeyword");

      assert.equal(ast.propertySignatures[1].name, "name");
      assert.equal(ast.propertySignatures[1].type._tag, "StringKeyword");
    });

    test("insertable", () => {
      const ast = insertable(_TodoTable).ast;
      assert(AST.isTypeLiteral(ast));

      assert.equal(ast.propertySignatures.length, 2);

      assert.equal(ast.propertySignatures[0].name, "id");
      assert.equal(ast.propertySignatures[0].isOptional, true);
      assert(AST.isUnion(ast.propertySignatures[0].type));
      assert.equal(ast.propertySignatures[0].type.types.length, 2);
      assert.equal(
        ast.propertySignatures[0].type.types[0]._tag,
        "NumberKeyword",
      );
      assert.equal(
        ast.propertySignatures[0].type.types[1]._tag,
        "UndefinedKeyword",
      );

      assert.equal(ast.propertySignatures[1].name, "name");
      assert.equal(ast.propertySignatures[1].type._tag, "StringKeyword");
    });

    test("updateable", () => {
      const ast = updateable(_TodoTable).ast;

      assert(AST.isTypeLiteral(ast));

      assert.equal(ast.propertySignatures.length, 2);

      assert.equal(ast.propertySignatures[0].name, "id");
      assert.equal(ast.propertySignatures[0].isOptional, true);
      assert(AST.isUnion(ast.propertySignatures[0].type));
      assert.equal(ast.propertySignatures[0].type.types.length, 2);
      assert.equal(
        ast.propertySignatures[0].type.types[0]._tag,
        "NumberKeyword",
      );
      assert.equal(
        ast.propertySignatures[0].type.types[1]._tag,
        "UndefinedKeyword",
      );

      assert.equal(ast.propertySignatures[1].name, "name");
      assert.equal(ast.propertySignatures[1].isOptional, true);
      assert(AST.isUnion(ast.propertySignatures[1].type));
      assert.equal(ast.propertySignatures[1].type.types.length, 2);
      assert.equal(
        ast.propertySignatures[1].type.types[0]._tag,
        "StringKeyword",
      );
      assert.equal(
        ast.propertySignatures[1].type.types[1]._tag,
        "UndefinedKeyword",
      );
    });
  });
});
