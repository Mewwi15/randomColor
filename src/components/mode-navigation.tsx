import Link from "next/link";
import { Icon } from "./icon";

export function ModeNavigation({ current, disabled = false }: { current: "wheel" | "timer"; disabled?: boolean }) {
  return <nav className="mode-navigation" aria-label="เลือกโหมดกิจกรรม">
    {([{ mode: "wheel", href: "/", label: "วงล้อ", icon: "sparkles" }, { mode: "timer", href: "/timer", label: "จับเวลา", icon: "timer" }] as const).map(item =>
      item.mode === current
        ? <span key={item.mode} className="mode-option is-current" aria-current="page"><Icon name={item.icon} size={18}/>{item.label}</span>
        : disabled
          ? <span key={item.mode} className="mode-option" aria-disabled="true"><Icon name={item.icon} size={18}/>{item.label}</span>
          : <Link key={item.mode} className="mode-option" href={item.href}><Icon name={item.icon} size={18}/>{item.label}</Link>
    )}
  </nav>;
}
