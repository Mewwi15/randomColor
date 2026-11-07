import type { Metadata } from "next";
import { CountdownMode } from "@/components/countdown-mode";

export const metadata: Metadata = { title: "นาฬิกาถอยหลัง | วงล้อศิลป์ถิ่นเรา" };

export default function TimerPage() {
  return <CountdownMode />;
}
