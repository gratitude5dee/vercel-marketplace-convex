import test from "node:test";
import assert from "node:assert/strict";

test("vapi transcript event fixture includes required fields", () => {
  const fixture = {
    eventId: "evt_123",
    message: {
      type: "transcript",
      transcriptType: "final",
      transcript: { text: "We should assign this to Alex.", speaker: "user" },
      call: { id: "call_123" },
    },
  };

  assert.equal(fixture.message.type, "transcript");
  assert.equal(typeof fixture.message.transcript.text, "string");
  assert.equal(typeof fixture.message.call.id, "string");
});
