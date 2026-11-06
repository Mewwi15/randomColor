/** Numbered slots for the teacher's forthcoming artwork, not substitute teaching images. */
export function PicturePlaceholder({ number, x, y, size = 100 }: { number: number; x?: number; y?: number; size?: number }) {
  return <svg x={x} y={y} width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="94" height="94" rx="19" fill="#FFFFFF" stroke="#C8B5E8" strokeWidth="2" />
    <rect x="21" y="17" width="58" height="43" rx="8" fill="#F3EDFD" stroke="#A990CF" strokeWidth="2" />
    <circle cx="61" cy="29" r="6" fill="#D2B9EF" />
    <path d="m23 55 15-20 12 13 8-8 19 16" stroke="#A990CF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <text x="50" y="84" textAnchor="middle" fill="#63438D" fontSize="22" fontWeight="800">{String(number).padStart(2, "0")}</text>
  </svg>;
}
