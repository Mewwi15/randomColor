import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_COUNTDOWN_MS, countdownReducer as reduce, formatCountdown, initialCountdown, remainingCountdown, restoreCountdown } from "./countdown.ts";

test("a late browser tick uses elapsed time instead of losing seconds in a background tab", () => {
  const state = reduce(initialCountdown(300_000), { type: "start", now: 1000 });
  assert.equal(remainingCountdown(state, 91_250), 209_750);
  assert.equal(formatCountdown(remainingCountdown(state, 91_250)), "03:30");
  assert.equal(reduce(state, { type: "finish", now: 91_250 }), state);
  const finished = reduce(state, { type: "finish", now: 900_000 });
  assert.equal(finished.status, "finished");
  assert.equal(remainingCountdown(finished, 901_000), 0);
  assert.equal(formatCountdown(finished.remainingMs), "00:00");
});

test("pausing keeps the exact remainder and resuming does not count the paused interval", () => {
  let state = reduce(initialCountdown(60_000), { type: "start", now: 1000 });
  assert.equal(reduce(state, { type: "start", now: 2000 }), state);
  state = reduce(state, { type: "pause", now: 11_250 });
  assert.equal(state.remainingMs, 49_750);
  assert.equal(remainingCountdown(state, 100_000), 49_750);
  state = reduce(state, { type: "start", now: 100_000 });
  assert.equal(state.endsAt, 149_750);
  assert.equal(remainingCountdown(state, 101_000), 48_750);
});

test("reload and mode switching retain the deadline; an expired saved timer returns finished", () => {
  const running = reduce(initialCountdown(60_000), { type: "start", now: 1000 });
  const restored = restoreCountdown(JSON.parse(JSON.stringify(running)), 31_000)!;
  assert.equal(restored.status, "running");
  assert.equal(restored.endsAt, running.endsAt);
  assert.equal(remainingCountdown(restored, 31_000), 30_000);
  const expired = restoreCountdown(running, 61_001)!;
  assert.equal(expired.status, "finished");
  assert.equal(expired.remainingMs, 0);
  const paused = reduce(running, { type: "pause", now: 21_000 });
  assert.deepEqual(restoreCountdown(paused, 900_000), paused);
});

test("reset cancels the deadline, prevents stale completion, and a finished timer can restart", () => {
  const running = reduce(initialCountdown(5000), { type: "start", now: 1000 });
  const reset = reduce(running, { type: "reset" });
  assert.deepEqual(reset, initialCountdown(5000));
  assert.equal(reduce(reset, { type: "finish", now: 10_000 }), reset);
  const finished = reduce(running, { type: "pause", now: 6000 });
  assert.equal(finished.status, "finished");
  const restarted = reduce(finished, { type: "start", now: 10_000 });
  assert.equal(restarted.endsAt, 15_000);
  assert.equal(restarted.remainingMs, 5000);
});

test("custom times stay within 00:01–99:59 and cannot change a running timer", () => {
  const idle = initialCountdown();
  for (const invalid of [0, -1000, 500, 1500, MAX_COUNTDOWN_MS + 1000, NaN, Infinity]) {
    assert.equal(reduce(idle, { type: "set-duration", durationMs: invalid }), idle);
  }
  assert.equal(formatCountdown(reduce(idle, { type: "set-duration", durationMs: MAX_COUNTDOWN_MS }).remainingMs), "99:59");
  assert.equal(formatCountdown(1), "00:01");
  const running = reduce(idle, { type: "start", now: 1000 });
  assert.equal(reduce(running, { type: "set-duration", durationMs: 5000 }), running);
});

test("invalid saved countdowns are rejected without affecting the activity", () => {
  const idle = initialCountdown();
  for (const invalid of [null, {}, { ...idle, status: "unknown" }, { ...idle, durationMs: 0 }, { ...idle, remainingMs: -1 },
    { ...idle, endsAt: 123 }, { ...idle, status: "running", endsAt: NaN }, { ...idle, status: "finished" },
    { ...idle, status: "paused", remainingMs: 0 }]) {
    assert.equal(restoreCountdown(invalid, 1000), null);
  }
});
