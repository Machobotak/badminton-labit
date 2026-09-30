import type { Metadata } from "next";
import BottomNav from "../components/BottomNav";
import ThemeInit from "../components/ThemeInit";
import ThemeToggle from "../components/ThemeToggle";
import TopNav from "../components/TopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Badminton Split — Patungan Badminton Tanpa Drama",
  description:
    "Sesi patungan badminton: multi-court, kok, biaya tambahan, dan tagihan otomatis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full" suppressHydrationWarning>
      <head>
        <ThemeInit />
      </head>
      <body className="min-h-full bg-surface-base">
        <TopNav />
        <div className="mx-auto w-full max-w-md px-5 pb-24 md:max-w-5xl md:px-8 md:pb-12">
          {children}
        </div>
        <ThemeToggle />
        <BottomNav />
      </body>
    </html>
  );
}
