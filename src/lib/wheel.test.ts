import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ENTRIES, colorAnswerTone, entryAtPointer, randomIndex, readEntries, targetRotation, wheelPoint } from "./wheel.ts";

test("yellow and purple reveal both tones while the other six keep their answers", () => {
  assert.deepEqual(DEFAULT_ENTRIES.map(entry => colorAnswerTone(entry.color)), ["warm", "warm", "both", "warm", "cool", "cool", "cool", "both"]);
  assert.equal(colorAnswerTone("#ffd000"), "both");
  assert.equal(colorAnswerTone("#6b35d4"), "both");
});

test("SVG coordinates stay identical despite server/browser trig precision differences", context => {
  const cases: { angle: number; radius: number }[] = [];
  for (let count = 2; count <= 16; count++) {
    for (let i = 0; i < count; i++) {
      for (const angle of [i * 360 / count, (i + 0.5) * 360 / count, (i + 1) * 360 / count]) {
        for (const radius of [178, 196, 250, 278]) cases.push({ angle, radius });
      }
    }
  }
  const snapshot = () => JSON.stringify(cases.map(({ angle, radius }) => wheelPoint(angle, radius)));
  const server = snapshot();
  const cos = Math.cos;
  const sin = Math.sin;
  context.mock.method(Math, "cos", (angle: number) => cos(angle) + Number.EPSILON);
  context.mock.method(Math, "sin", (angle: number) => sin(angle) - Number.EPSILON);
  assert.equal(snapshot(), server);
  // The image-wheel dot reported in the hydration overlay was 77.7457514062631…
  assert.equal(wheelPoint(234, 250).x, 77.745751);
});

test("all possible winners land under the pointer, including consecutive spins", () => {
  let rotation = 0;
  for (let count = 1; count <= 16; count++) {
    for (let winner = 0; winner < count; winner++) {
      const next = targetRotation(rotation, winner, count);
      assert.ok(next - rotation >= 2160);
      assert.equal(entryAtPointer(next, count), winner);
      rotation = next;
    }
  }
});

test("random selection stays within every supported wheel size", () => {
  for (let count = 1; count <= 16; count++) {
    for (let i = 0; i < 100; i++) {
      const index = randomIndex(count);
      assert.ok(Number.isInteger(index) && index >= 0 && index < count);
    }
  }
  assert.throws(() => randomIndex(0), RangeError);
  assert.throws(() => randomIndex(17), RangeError);
});

test("stored entries reject malformed, blank, duplicate, and oversized data", () => {
  assert.deepEqual(readEntries(DEFAULT_ENTRIES), DEFAULT_ENTRIES);
  assert.equal(readEntries(null), null);
  assert.equal(readEntries([DEFAULT_ENTRIES[0]]), null);
  assert.equal(readEntries(Array(17).fill(DEFAULT_ENTRIES[0])), null);
  assert.equal(readEntries([DEFAULT_ENTRIES[0], DEFAULT_ENTRIES[0]]), null);
  assert.equal(readEntries([{ ...DEFAULT_ENTRIES[0], label: " " }, DEFAULT_ENTRIES[1]]), null);
  assert.equal(readEntries([{ ...DEFAULT_ENTRIES[0], color: "invalid" }, DEFAULT_ENTRIES[1]]), null);
});
