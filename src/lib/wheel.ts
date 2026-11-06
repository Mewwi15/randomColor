export type WheelEntry = { id: string; label: string; color: string; imageSrc?: string; wheelLabelLines?: string[] };
export type SpinResult = WheelEntry & { resultId: string; time: string };

export const WARM_COLORS = ["#EF233C", "#FF7900", "#FFD000", "#E60073"];
export const COOL_COLORS = ["#009B63", "#00B8D9", "#2455F5", "#6B35D4"];
export const PALETTE = [...WARM_COLORS, ...COOL_COLORS];
export const MAX_ENTRIES = 16;
export const STORAGE_KEY = "domain-quest-wheel-v1";
export const DEFAULT_ENTRIES: WheelEntry[] = ["สีแดง", "สีส้ม", "สีเหลือง", "สีชมพู", "สีเขียว", "สีฟ้า", "สีน้ำเงิน", "สีม่วง"].map((label, i) => ({ id: `color-${[7, 1, 2, 0, 3, 4, 5, 6][i]}`, label, color: PALETTE[i] }));

const LEGACY_COLORS: Record<string, string> = {
  "#f88ca5": WARM_COLORS[3], "#ffad69": WARM_COLORS[1],
  "#f8d768": WARM_COLORS[2], "#f1817a": WARM_COLORS[0],
  "#83d4a5": COOL_COLORS[0], "#72d3e3": COOL_COLORS[1],
  "#7ea7ed": COOL_COLORS[2], "#b599ed": COOL_COLORS[3],
};

export function colorTone(color: string): "warm" | "cool" {
  const [r, g, b] = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta === 0) return "cool";
  const hue = ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360;
  return hue < 75 || hue >= 315 ? "warm" : "cool";
}

/** Classroom answers: yellow and purple can belong to either temperature family. */
export function colorAnswerTone(color: string): "warm" | "cool" | "both" {
  const normalized = color.toUpperCase();
  if (normalized === WARM_COLORS[2] || normalized === COOL_COLORS[3]) return "both";
  return colorTone(color);
}

/** Keep the two color families together, including after adding or shuffling. */
export function groupByTone(entries: WheelEntry[]): WheelEntry[] {
  return [...entries].sort((a, b) => Number(colorTone(a.color) === "cool") - Number(colorTone(b.color) === "cool"));
}

/** Upgrade saved pastel colors without discarding custom labels or entry IDs. */
export function refreshPalette(entries: WheelEntry[]): WheelEntry[] {
  return groupByTone(entries.map(entry => ({ ...entry, color: LEGACY_COLORS[entry.color.toLowerCase()] ?? entry.color })));
}

export function labelColor(color: string): string {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map(offset => {
      const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const background = luminance(color);
  const dark = "#17213D";
  return 1.05 / (background + 0.05) > (background + 0.05) / (luminance(dark) + 0.05) ? "#FFFFFF" : dark;
}

// getRandomValues also works over local-network HTTP, unlike randomUUID.
export function createId(): string {
  return Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, "0")).join("");
}

export function randomIndex(count: number): number {
  if (!Number.isInteger(count) || count < 1 || count > MAX_ENTRIES) throw new RangeError("Invalid entry count");
  const limit = Math.floor(2 ** 32 / count) * count;
  const buffer = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return buffer[0] % count;
}

/** Normalize trig precision so server and browser produce identical SVG attributes. */
export function wheelPoint(angle: number, radius: number) {
  const radian = (angle - 90) * Math.PI / 180;
  return {
    x: Number((280 + radius * Math.cos(radian)).toFixed(6)),
    y: Number((280 + radius * Math.sin(radian)).toFixed(6)),
  };
}

/** Each slice starts at twelve o'clock. Land its midpoint under the fixed pointer. */
export function targetRotation(current: number, index: number, count: number): number {
  const midpoint = (index + 0.5) * (360 / count);
  const target = (360 - midpoint) % 360;
  const offset = ((target - (current % 360)) + 360) % 360;
  return current + 360 * 6 + offset;
}

export function entryAtPointer(rotation: number, count: number): number {
  const angle = ((-rotation % 360) + 360) % 360;
  return Math.floor(angle / (360 / count));
}

export function readEntries(value: unknown): WheelEntry[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_ENTRIES) return null;
  const ids = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry.id !== "string" || ids.has(entry.id) || typeof entry.label !== "string" || !entry.label.trim() || entry.label.length > 24 || typeof entry.color !== "string" || !/^#[0-9a-f]{6}$/i.test(entry.color)) return null;
    ids.add(entry.id);
  }
  return value as WheelEntry[];
}
