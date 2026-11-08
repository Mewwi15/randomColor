import { test } from "node:test";
import assert from "node:assert/strict";
import { initialSlideDisplay, slideDisplayReducer as reduce, slidePagesToRender } from "./slide-display.ts";

test("a slow slide keeps the previous decoded image visible until the requested image is ready", () => {
  let state = reduce(initialSlideDisplay(11), { type: "loaded", page: 0 });
  state = reduce(state, { type: "select", page: 1 });
  assert.equal(state.visiblePage, 0);
  assert.ok(slidePagesToRender(state).includes(0));
  assert.ok(!state.readyPages.includes(1));
  state = reduce(state, { type: "loaded", page: 1 });
  assert.equal(state.visiblePage, 1);
  assert.ok(state.readyPages.includes(1));
});

test("adjacent images preload without changing the slide and can be shown immediately when selected", () => {
  let state = reduce(initialSlideDisplay(11), { type: "loaded", page: 0 });
  state = reduce(state, { type: "loaded", page: 1 });
  assert.equal(state.visiblePage, 0);
  state = reduce(state, { type: "select", page: 1 });
  assert.equal(state.visiblePage, 1);
  state = reduce(state, { type: "select", page: 0 });
  assert.equal(state.visiblePage, 0);
});

test("rapid navigation ignores out-of-order image loads and preserves the old image across a distant jump", () => {
  let state = reduce(initialSlideDisplay(11), { type: "loaded", page: 0 });
  state = reduce(state, { type: "select", page: 1 });
  state = reduce(state, { type: "select", page: 8 });
  state = reduce(state, { type: "loaded", page: 1 });
  assert.equal(state.visiblePage, 0);
  state = reduce(state, { type: "loaded", page: 7 });
  assert.equal(state.visiblePage, 0);
  state = reduce(state, { type: "loaded", page: 8 });
  assert.equal(state.visiblePage, 8);
});

test("returning to an unmounted image waits for its new element to decode even if it loaded earlier", () => {
  let state = reduce(initialSlideDisplay(11), { type: "loaded", page: 0 });
  state = reduce(state, { type: "loaded", page: 1 });
  state = reduce(state, { type: "select", page: 1 });
  state = reduce(state, { type: "select", page: 8 });
  state = reduce(state, { type: "loaded", page: 8 });
  assert.ok(!slidePagesToRender(state).includes(0));
  state = reduce(state, { type: "select", page: 0 });
  assert.equal(state.visiblePage, 8);
  assert.ok(!state.readyPages.includes(0));
  state = reduce(state, { type: "loaded", page: 0 });
  assert.equal(state.visiblePage, 0);
});

test("image layers stay bounded while going through the whole deck and keep readiness only for mounted images", () => {
  let state = initialSlideDisplay(11);
  for (let page = 0; page < 11; page++) {
    state = reduce(state, { type: "select", page });
    const mounted = slidePagesToRender(state);
    assert.ok(mounted.length <= 4);
    assert.ok(mounted.every(index => index >= 0 && index < 11));
    for (const index of mounted) state = reduce(state, { type: "loaded", page: index });
    assert.equal(state.visiblePage, page);
    assert.ok(state.readyPages.every(index => slidePagesToRender(state).includes(index)));
  }
  for (const page of [-1, 11, NaN, 1.5]) assert.equal(reduce(state, { type: "select", page }), state);
});
