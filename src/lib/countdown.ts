export const COUNTDOWN_STORAGE_KEY = "art-local-countdown-v1";
export const DEFAULT_COUNTDOWN_MS = 10 * 60_000;
export const MAX_COUNTDOWN_MS = (99 * 60 + 59) * 1000;

export type Countdown = {
  status: "idle" | "running" | "paused" | "finished";
  durationMs: number;
  remainingMs: number;
  endsAt: number | null;
};
export type CountdownAction =
  | { type: "set-duration"; durationMs: number }
  | { type: "start" | "pause" | "finish"; now: number }
  | { type: "reset" }
  | { type: "restore"; state: Countdown };

function validDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1000 && value <= MAX_COUNTDOWN_MS && value % 1000 === 0;
}

export function initialCountdown(durationMs = DEFAULT_COUNTDOWN_MS): Countdown {
  return { status: "idle", durationMs, remainingMs: durationMs, endsAt: null };
}

/** A deadline keeps time accurate even when the browser throttles a hidden tab. */
export function remainingCountdown(state: Countdown, now: number): number {
  return state.status === "running" && state.endsAt !== null
    ? Math.max(0, Math.min(state.durationMs, state.endsAt - now))
    : state.remainingMs;
}

export function countdownReducer(state: Countdown, action: CountdownAction): Countdown {
  switch (action.type) {
    case "restore": return action.state;
    case "reset": return initialCountdown(state.durationMs);
    case "set-duration": return state.status !== "running" && validDuration(action.durationMs) ? initialCountdown(action.durationMs) : state;
    case "start": {
      if (state.status === "running") return state;
      const remainingMs = state.status === "finished" ? state.durationMs : state.remainingMs;
      return { ...state, status: "running", remainingMs, endsAt: action.now + remainingMs };
    }
    case "pause": {
      if (state.status !== "running") return state;
      const remainingMs = remainingCountdown(state, action.now);
      return { ...state, status: remainingMs > 0 ? "paused" : "finished", remainingMs, endsAt: null };
    }
    case "finish": return state.status === "running" && remainingCountdown(state, action.now) === 0
      ? { ...state, status: "finished", remainingMs: 0, endsAt: null } : state;
  }
}

export function restoreCountdown(value: unknown, now: number): Countdown | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (!validDuration(data.durationMs) || typeof data.remainingMs !== "number" || !Number.isInteger(data.remainingMs) || data.remainingMs < 0 || data.remainingMs > data.durationMs) return null;
  if (!["idle", "running", "paused", "finished"].includes(data.status as string)) return null;
  if (data.status === "running") {
    if (typeof data.endsAt !== "number" || !Number.isSafeInteger(data.endsAt) || data.endsAt <= 0) return null;
    const remainingMs = Math.max(0, Math.min(data.durationMs, data.endsAt - now));
    return { status: remainingMs ? "running" : "finished", durationMs: data.durationMs, remainingMs, endsAt: remainingMs ? now + remainingMs : null };
  }
  if (data.endsAt !== null || (data.status === "idle" && data.remainingMs !== data.durationMs)
    || (data.status === "paused" && data.remainingMs === 0) || (data.status === "finished" && data.remainingMs !== 0)) return null;
  return { status: data.status as Countdown["status"], durationMs: data.durationMs, remainingMs: data.remainingMs, endsAt: null };
}

export function formatCountdown(remainingMs: number): string {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
