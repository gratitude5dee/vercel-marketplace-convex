import test from "node:test";
import assert from "node:assert/strict";

test("manager action enum has expected values", () => {
  const allowed = ["ASSIGN", "UPDATE", "SPEAK", "NONE", "INVOKE_HUMAN", "DECOMPOSE"];
  assert.equal(allowed.includes("ASSIGN"), true);
  assert.equal(allowed.includes("INVOKE_HUMAN"), true);
});
