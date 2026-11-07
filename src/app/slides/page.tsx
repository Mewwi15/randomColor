import type { Metadata } from "next";
import { SlidesMode } from "@/components/slides-mode";

export const metadata: Metadata = { title: "สไลด์การสอน | วงล้อศิลป์ถิ่นเรา" };

export default function SlidesPage() {
  return <SlidesMode />;
}
