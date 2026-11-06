import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ENTRIES, entryAtPointer } from "./wheel.ts";
import { PICTURE_ENTRIES, TOTAL_ROUNDS, activityReducer as reduce, availableColors, availablePictures, canSpin, initialActivity, restoreActivity, type ActivityState } from "./activity.ts";

function colorResult(state: ActivityState, colorId: string): ActivityState {
  return reduce(reduce(state, { type: "spin", wheel: "color", entryId: colorId, duration: 5400 }), { type: "land" });
}

function finishRound(state: ActivityState, colorId: string, imageId = availablePictures(state)[0].id): ActivityState {
  let next = colorResult(state, colorId);
  next = reduce(next, { type: "reveal" });
  next = reduce(next, { type: "continue-color" });
  next = reduce(next, { type: "spin", wheel: "image", entryId: imageId, duration: 5400 });
  next = reduce(next, { type: "land" });
  return reduce(next, { type: "next-round" });
}

test("a round requires color, explicit teacher reveal, and image in that order", () => {
  let state = initialActivity();
  assert.equal(availableColors(state).length, 8);
  assert.equal(PICTURE_ENTRIES.length, 10);
  state = reduce(state, { type: "select", wheel: "image" });
  assert.equal(state.activeWheel, "image");
  assert.equal(canSpin(state, "image"), false);
  assert.equal(reduce(state, { type: "spin", wheel: "image", entryId: PICTURE_ENTRIES[0].id, duration: 120 }), state);
  state = reduce(state, { type: "select", wheel: "color" });
  state = colorResult(state, DEFAULT_ENTRIES[0].id);
  assert.equal(state.phase, "color-question");
  assert.equal(state.rounds.length, 0);
  assert.equal(reduce(state, { type: "continue-color" }), state);
  assert.equal(reduce(state, { type: "next-round" }), state);
  state = reduce(state, { type: "reveal" });
  assert.equal(state.phase, "color-answer");
  state = reduce(state, { type: "continue-color" });
  assert.equal(state.activeWheel, "image");
  assert.equal(canSpin(state, "color"), false);
  state = reduce(state, { type: "spin", wheel: "image", entryId: PICTURE_ENTRIES[4].id, duration: 120 });
  state = reduce(state, { type: "land" });
  assert.equal(state.rounds.length, 0);
  state = reduce(state, { type: "next-round" });
  assert.deepEqual(state.rounds, [{ colorId: DEFAULT_ENTRIES[0].id, imageId: PICTURE_ENTRIES[4].id }]);
  assert.equal(state.phase, "color-ready");
  assert.equal(state.activeWheel, "color");
});

test("a color retires on its second use, after the result, and cannot return", () => {
  const red = DEFAULT_ENTRIES[0];
  let state = finishRound(initialActivity(), red.id);
  assert.equal(availableColors(state).length, 8);
  state = colorResult(state, red.id);
  const before = availableColors(state);
  assert.equal(before.length, 8);
  assert.equal(before[entryAtPointer(state.colorRotation, before.length)].id, red.id);
  state = reduce(state, { type: "reveal" });
  state = reduce(state, { type: "continue-color" });
  assert.equal(state.colorRotation, 0);
  assert.equal(availableColors(state).length, 7);
  assert.equal(availableColors(state).some(entry => entry.id === red.id), false);
  state = reduce(state, { type: "spin", wheel: "image", entryId: availablePictures(state)[0].id, duration: 120 });
  state = reduce(state, { type: "land" });
  state = reduce(state, { type: "next-round" });
  assert.equal(availableColors(state).length, 7);
  assert.equal(reduce(state, { type: "spin", wheel: "color", entryId: red.id, duration: 120 }), state);
});

test("exactly ten unique images complete the game; reset restores all colors and images", () => {
  let state = initialActivity();
  for (let round = 0; round < TOTAL_ROUNDS; round++) {
    const entry = availableColors(state)[0];
    state = finishRound(state, entry.id, PICTURE_ENTRIES[round].id);
    assert.equal(state.rounds.length, round + 1);
    assert.equal(availablePictures(state).length, TOTAL_ROUNDS - round - 1);
    assert.equal(state.phase, round === 9 ? "complete" : "color-ready");
  }
  assert.equal(availableColors(state).length, 3);
  assert.equal(new Set(state.rounds.map(round => round.imageId)).size, TOTAL_ROUNDS);
  assert.deepEqual(availablePictures(state), []);
  assert.equal(canSpin(state, "color"), false);
  assert.equal(canSpin(state, "image"), false);
  assert.equal(reduce(state, { type: "next-round" }), state);
  assert.equal(reduce(state, { type: "spin", wheel: "color", entryId: availableColors(state)[0].id, duration: 120 }), state);
  state = reduce(state, { type: "reset" });
  assert.deepEqual(state, initialActivity());
  assert.equal(availableColors(state).length, 8);
  assert.deepEqual(availablePictures(state), PICTURE_ENTRIES);
});

test("each image retires once on landing, stays on the result card, and cannot be picked again", () => {
  let state = initialActivity();
  state = colorResult(state, DEFAULT_ENTRIES[0].id);
  state = reduce(reduce(state, { type: "reveal" }), { type: "continue-color" });
  const winner = PICTURE_ENTRIES[4];
  state = reduce(state, { type: "spin", wheel: "image", entryId: winner.id, duration: 120 });
  assert.equal(availablePictures(state).length, 10);
  assert.equal(availablePictures(state)[entryAtPointer(state.imageRotation, 10)].id, winner.id);
  state = reduce(state, { type: "land" });
  assert.equal(state.pendingImageId, winner.id);
  assert.equal(state.phase, "image-result");
  assert.equal(availablePictures(state).length, 9);
  assert.equal(availablePictures(state).some(entry => entry.id === winner.id), false);
  assert.equal(reduce(state, { type: "land" }), state);
  const restored = restoreActivity(JSON.parse(JSON.stringify(state)))!;
  assert.equal(restored.pendingImageId, winner.id);
  assert.deepEqual(availablePictures(restored), availablePictures(state));
  state = reduce(restored, { type: "next-round" });
  assert.equal(availablePictures(state).length, 9);
  assert.equal(reduce(state, { type: "next-round" }), state);
  state = colorResult(state, DEFAULT_ENTRIES[1].id);
  state = reduce(reduce(state, { type: "reveal" }), { type: "continue-color" });
  assert.equal(canSpin(state, "image"), true);
  assert.equal(reduce(state, { type: "spin", wheel: "image", entryId: winner.id, duration: 120 }), state);
});

test("older saved sessions keep completed rounds and re-spin an already-used pending image", () => {
  let state = finishRound(initialActivity(), DEFAULT_ENTRIES[0].id);
  state = colorResult(state, DEFAULT_ENTRIES[1].id);
  state = reduce(reduce(state, { type: "reveal" }), { type: "continue-color" });
  const restored = restoreActivity({ ...state, phase: "image-result", pendingImageId: state.rounds[0].imageId })!;
  assert.deepEqual(restored.rounds, state.rounds);
  assert.equal(restored.phase, "image-ready");
  assert.equal(restored.pendingColorId, state.pendingColorId);
  assert.equal(restored.pendingImageId, null);
  assert.equal(availablePictures(restored).length, 9);
  assert.equal(canSpin(restored, "image"), true);
});

test("rapid duplicate events cannot double-count, reveal early, or switch a spinning wheel", () => {
  const action = { type: "spin", wheel: "color", entryId: DEFAULT_ENTRIES[1].id, duration: 5400 } as const;
  let state = reduce(initialActivity(), action);
  assert.equal(reduce(state, action), state);
  assert.equal(reduce(state, { type: "reset" }), state);
  assert.equal(reduce(state, { type: "select", wheel: "image" }), state);
  assert.equal(reduce(state, { type: "reveal" }), state);
  state = reduce(state, { type: "land" });
  assert.equal(reduce(state, { type: "land" }), state);
});

test("restore keeps pending questions hidden, saved pairs, and retired colors consistent", () => {
  let state = finishRound(initialActivity(), DEFAULT_ENTRIES[0].id);
  state = colorResult(state, DEFAULT_ENTRIES[0].id);
  const restored = restoreActivity(JSON.parse(JSON.stringify(state)));
  assert.equal(restored?.phase, "color-question");
  assert.equal(restored?.pendingColorId, DEFAULT_ENTRIES[0].id);
  assert.equal(restored?.rounds.length, 1);
  state = reduce(reduce(state, { type: "reveal" }), { type: "continue-color" });
  assert.equal(availableColors(restoreActivity(state)!).length, 7);
  assert.equal(restoreActivity(null), null);
  assert.equal(restoreActivity({ ...state, phase: "complete" }), null);
  assert.equal(restoreActivity({ ...state, pendingColorId: "unknown" }), null);
  assert.equal(restoreActivity({ ...state, pendingImageId: PICTURE_ENTRIES[0].id }), null);
  assert.equal(restoreActivity({ ...state, phase: "color-spinning" }), null);
  assert.equal(restoreActivity({ ...state, rounds: Array(3).fill(state.rounds[0]) }), null);
});

test("wheel pointers stay aligned as colors and images are removed across all ten rounds", () => {
  let state = initialActivity();
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const entries = availableColors(state);
    const chosen = entries[Math.min(2, entries.length - 1)];
    state = colorResult(state, chosen.id);
    assert.equal(entries[entryAtPointer(state.colorRotation, entries.length)].id, chosen.id);
    state = reduce(reduce(state, { type: "reveal" }), { type: "continue-color" });
    const pictures = availablePictures(state);
    const picture = pictures[Math.floor(pictures.length / 2)];
    state = reduce(state, { type: "spin", wheel: "image", entryId: picture.id, duration: 120 });
    assert.equal(pictures[entryAtPointer(state.imageRotation, pictures.length)].id, picture.id);
    state = reduce(reduce(state, { type: "land" }), { type: "next-round" });
  }
});
