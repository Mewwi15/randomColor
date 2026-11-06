import type { CSSProperties } from "react";
import { getImageProps } from "next/image";
import { colorTone, labelColor, wheelPoint as point, type WheelEntry } from "@/lib/wheel";
import { PicturePlaceholder } from "./picture-placeholder";

export function LuckyWheel({ entries, rotation, spinning, duration, onSpin, variant = "color", disabled = false }: {
  entries: WheelEntry[]; rotation: number; spinning: boolean; duration: number; onSpin: () => void; variant?: "color" | "image"; disabled?: boolean;
}) {
  const slice = entries.length ? 360 / entries.length : 0;
  return <div className={`wheel-frame ${spinning ? "is-spinning" : ""}`}>
    <div className="wheel-pointer" aria-hidden="true"><span /></div>
    <div className="wheel-lights" aria-hidden="true">{Array.from({ length: 32 }, (_, i) => <i key={i} style={{ "--light-angle": `${i * 11.25}deg` } as CSSProperties} />)}</div>
    <svg className="wheel-disc" viewBox="0 0 560 560" role="img" aria-label={`วงล้อ${variant === "color" ? "สี" : "ภาพ"} ${entries.length} ช่อง: ${entries.map(e => e.label).join(", ")}`} style={{ transform: `rotate(${rotation}deg)`, transitionDuration: `${duration}ms` }}>
      {entries.length === 0 && <circle cx="280" cy="280" r="278" fill="#F3EDFD" />}
      {entries.map((entry, i) => {
        const start = point(i * slice, 278);
        const end = point((i + 1) * slice, 278);
        const mid = i * slice + slice / 2;
        const text = point(mid, variant === "image" ? 196 : 178);
        const textAngle = mid - 90 + (mid > 180 ? 180 : 0);
        const label = Array.from(entry.label);
        const pictureLines = entry.wheelLabelLines ?? [entry.label];
        return <g key={entry.id}>
          {entries.length === 1
            ? <circle cx="280" cy="280" r="278" fill={entry.color} stroke="#fff7e5" strokeWidth="2" />
            : <path d={`M280 280 L${start.x} ${start.y} A278 278 0 ${slice > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`} fill={entry.color} stroke="#fff7e5" strokeWidth="2" />}
          {variant === "image" ? <g transform={`translate(${text.x} ${text.y}) rotate(${mid})`}>
            {entry.imageSrc ? <>
              <rect x="-50" y="-38" width="100" height="76" rx="7" fill="white" />
              <image href={getImageProps({ src: entry.imageSrc, alt: entry.label, width: 192, height: 136 }).props.src} x="-48" y="-34" width="96" height="68" preserveAspectRatio="xMidYMid meet" />
              <text x="0" y="52" textAnchor="middle" fill="#382851" fontSize={pictureLines.length > 1 ? 12 : 14} fontWeight="700" aria-label={entry.label}>{pictureLines.map((line, index) => <tspan key={index} x="0" dy={index === 0 ? 0 : 14}>{line}</tspan>)}</text>
            </> : <PicturePlaceholder number={i + 1} x={-47} y={-47} size={94} />}
          </g> : <text x={text.x} y={text.y} transform={`rotate(${textAngle} ${text.x} ${text.y})`} textAnchor="middle" dominantBaseline="central" fill={labelColor(entry.color)} fontWeight="800" fontSize="28">{label.length > 12 ? `${label.slice(0, 11).join("")}…` : entry.label}</text>}
          <circle cx={point(mid, 250).x} cy={point(mid, 250).y} r="4" fill="white" opacity=".7" />
        </g>;
      })}
      {variant === "color" && entries.map((entry, i) => {
        if (colorTone(entry.color) === colorTone(entries[(i + entries.length - 1) % entries.length].color)) return null;
        const end = point(i * slice, 278);
        return <line key={`tone-${entry.id}`} x1="280" y1="280" x2={end.x} y2={end.y} stroke="#FFFFFF" strokeWidth="7" />;
      })}
    </svg>
    <button className="wheel-hub" onClick={onSpin} disabled={spinning || disabled || entries.length === 0} aria-label={entries.length === 0 ? "สุ่มครบแล้ว" : `หมุนวงล้อ${variant === "color" ? "สี" : "ภาพ"}`}><span aria-hidden="true">✦</span><b>{entries.length === 0 ? "ครบแล้ว" : "หมุน"}</b></button>
  </div>;
}
