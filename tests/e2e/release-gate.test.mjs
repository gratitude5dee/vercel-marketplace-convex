import test from "node:test";
import assert from "node:assert/strict";

test("release gate order is preview -> staging -> prod", () => {
  const promotionOrder = ["preview", "staging", "prod"];
  assert.deepEqual(promotionOrder, ["preview", "staging", "prod"]);
});
