import { DEFAULT_ENTRIES, targetRotation, type WheelEntry } from "./wheel.ts";

export const TOTAL_ROUNDS = 10;
export const COLOR_LIMIT = 2;
export const ACTIVITY_STORAGE_KEY = "art-local-classroom-v1";

// Keep this order and the picture IDs stable for saved classroom sessions.
// Originals are in UI/img; the public copies retain the complete, unedited images.
const PICTURES = [
  { label: "หอยนางรม", file: "oysters.png" },
  { label: "ชักพระ", file: "chak-phra.png" },
  { label: "ดอกบัวผุด", file: "rafflesia.png" },
  { label: "หนังตะลุง", file: "shadow-puppet.png" },
  { label: "ทะเล", file: "seaside.png" },
  { label: "กรีดยาง", file: "rubber-tapping.png" },
  { label: "เจดีย์", file: "pagoda.png" },
  { label: "เงาะ", file: "rambutan.png" },
  { label: "ผ้าลายดอก", file: "floral-fabric.png" },
  { label: "ไข่เป็ด", file: "duck-eggs.png" },
];

export const PICTURE_ENTRIES: WheelEntry[] = PICTURES.map((picture, index) => ({
  id: `picture-${index + 1}`,
  label: picture.label,
  color: index % 2 === 0 ? "#E8E1FF" : "#FFF8EC",
  imageSrc: `/wheel-images/${picture.file}`,
}));

export type WheelKind = "color" | "image";
export type Phase = "color-ready" | "color-spinning" | "color-question" | "color-answer" | "image-ready" | "image-spinning" | "image-result" | "complete";
export type Round = { colorId: string; imageId: string };
export type ActivityState = {
  phase: Phase;
  activeWheel: WheelKind;
  rounds: Round[];
  pendingColorId: string | null;
  pendingImageId: string | null;
  colorRotation: number;
  imageRotation: number;
  duration: number;
};
export type ActivityAction =
  | { type: "select"; wheel: WheelKind }
  | { type: "spin"; wheel: WheelKind; entryId: string; duration: number }
  | { type: "land" }
  | { type: "reveal" }
  | { type: "continue-color" }
  | { type: "next-round" }
  | { type: "reset" }
  | { type: "restore"; state: ActivityState };

export function initialActivity(): ActivityState {
  return { phase: "color-ready", activeWheel: "color", rounds: [], pendingColorId: null, pendingImageId: null, colorRotation: 0, imageRotation: 0, duration: 0 };
}

export function isSpinning(state: ActivityState): boolean {
  return state.phase === "color-spinning" || state.phase === "image-spinning";
}

export function isShowingResult(state: ActivityState): boolean {
  return ["color-question", "color-answer", "image-result"].includes(state.phase);
}

export function colorUses(state: ActivityState, id: string): number {
  return state.rounds.filter(round => round.colorId === id).length;
}

export function availableColors(state: ActivityState): WheelEntry[] {
  // Preserve the original slices until the teacher dismisses the color result.
  const includePending = state.phase.startsWith("image-");
  return DEFAULT_ENTRIES.filter(entry => colorUses(state, entry.id) + Number(includePending && state.pendingColorId === entry.id) < COLOR_LIMIT);
}

export function availablePictures(state: ActivityState): WheelEntry[] {
  const used = new Set(state.rounds.map(round => round.imageId));
  // Remove the winner as soon as it lands, while keeping its result card visible.
  if (state.phase === "image-result" && state.pendingImageId) used.add(state.pendingImageId);
  return PICTURE_ENTRIES.filter(entry => !used.has(entry.id));
}

export function canSpin(state: ActivityState, wheel: WheelKind): boolean {
  return state.rounds.length < TOTAL_ROUNDS && state.activeWheel === wheel && state.phase === `${wheel}-ready`
    && (wheel === "color" ? availableColors(state) : availablePictures(state)).length > 0;
}

export function activityReducer(state: ActivityState, action: ActivityAction): ActivityState {
  switch (action.type) {
    case "restore": return action.state;
    case "reset": return isSpinning(state) ? state : initialActivity();
    case "select":
      return state.phase === "color-ready" || state.phase === "image-ready" ? { ...state, activeWheel: action.wheel } : state;
    case "spin": {
      if (!canSpin(state, action.wheel)) return state;
      const entries = action.wheel === "color" ? availableColors(state) : availablePictures(state);
      const index = entries.findIndex(entry => entry.id === action.entryId);
      if (index < 0) return state;
      return action.wheel === "color"
        ? { ...state, phase: "color-spinning", pendingColorId: action.entryId, duration: action.duration, colorRotation: targetRotation(state.colorRotation, index, entries.length) }
        : { ...state, phase: "image-spinning", pendingImageId: action.entryId, duration: action.duration, imageRotation: targetRotation(state.imageRotation, index, entries.length) };
    }
    case "land":
      if (state.phase === "color-spinning") return { ...state, phase: "color-question" };
      if (state.phase === "image-spinning") return { ...state, phase: "image-result", imageRotation: 0, duration: 0 };
      return state;
    case "reveal":
      return state.phase === "color-question" ? { ...state, phase: "color-answer" } : state;
    case "continue-color": {
      if (state.phase !== "color-answer" || !state.pendingColorId) return state;
      const removing = colorUses(state, state.pendingColorId) + 1 >= COLOR_LIMIT;
      return { ...state, phase: "image-ready", activeWheel: "image", duration: 0, colorRotation: removing ? 0 : state.colorRotation };
    }
    case "next-round": {
      if (state.phase !== "image-result" || !state.pendingColorId || !state.pendingImageId) return state;
      const rounds = [...state.rounds, { colorId: state.pendingColorId, imageId: state.pendingImageId }];
      return { ...state, rounds, phase: rounds.length === TOTAL_ROUNDS ? "complete" : "color-ready", activeWheel: "color", pendingColorId: null, pendingImageId: null, duration: 0 };
    }
  }
}

/** Only restore consistent, completed steps. An interrupted spin resumes before the spin. */
export function restoreActivity(value: unknown): ActivityState | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.rounds) || data.rounds.length > TOTAL_ROUNDS) return null;
  const rounds: Round[] = [];
  for (const round of data.rounds) {
    if (!round || !DEFAULT_ENTRIES.some(entry => entry.id === round.colorId) || !PICTURE_ENTRIES.some(entry => entry.id === round.imageId)) return null;
    if (rounds.filter(previous => previous.colorId === round.colorId).length >= COLOR_LIMIT) return null;
    rounds.push({ colorId: round.colorId, imageId: round.imageId });
  }
  const phase = data.phase as Phase;
  if (!["color-ready", "color-question", "color-answer", "image-ready", "image-result", "complete"].includes(phase)) return null;
  if ((phase === "complete") !== (rounds.length === TOTAL_ROUNDS)) return null;
  if (data.activeWheel !== "color" && data.activeWheel !== "image") return null;
  const needsColor = !["color-ready", "complete"].includes(phase);
  if (needsColor) {
    if (!DEFAULT_ENTRIES.some(entry => entry.id === data.pendingColorId) || rounds.filter(round => round.colorId === data.pendingColorId).length >= COLOR_LIMIT) return null;
  } else if (data.pendingColorId !== null) return null;
  if (phase === "image-result") {
    if (!PICTURE_ENTRIES.some(entry => entry.id === data.pendingImageId)) return null;
  } else if (data.pendingImageId !== null) return null;
  if ((phase === "color-question" || phase === "color-answer") && data.activeWheel !== "color") return null;
  if (phase === "image-result" && data.activeWheel !== "image") return null;
  // Older sessions allowed repeats. Keep their completed rounds, but re-spin a
  // pending result that already appeared before the no-repeat rule was added.
  const repeatPendingImage = phase === "image-result" && rounds.some(round => round.imageId === data.pendingImageId);
  const rotation = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 1e9 ? value : 0;
  return {
    phase: repeatPendingImage ? "image-ready" : phase, activeWheel: data.activeWheel, rounds,
    pendingColorId: needsColor ? data.pendingColorId as string : null,
    pendingImageId: phase === "image-result" && !repeatPendingImage ? data.pendingImageId as string : null,
    colorRotation: rotation(data.colorRotation), imageRotation: phase === "image-result" ? 0 : rotation(data.imageRotation), duration: 0,
  };
}
