import type { Metadata, Viewport } from "next";
import { ViewportSize } from "@/components/viewport-size";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/500.css";
import "@fontsource/noto-sans-thai/600.css";
import "@fontsource/noto-sans-thai/700.css";
import "@fontsource/noto-sans-thai/800.css";
import "./globals.css";
import "./responsive.css";

export const metadata: Metadata = {
  title: "วงล้อศิลป์ถิ่นเรา | CEO Domain Quest",
  description: "สื่อการสอนศิลปะ วงล้อสี 8 สีและวงล้อภาพ 10 ภาพ เรียนรู้โทนร้อนโทนเย็นกับคุณครู เล่นครบ 10 รอบ พร้อมโหมด TV",
};

export const viewport: Viewport = { themeColor: "#188ce5", width: "device-width", initialScale: 1, viewportFit: "cover", interactiveWidget: "resizes-content" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body><ViewportSize/>{children}</body></html>;
}
