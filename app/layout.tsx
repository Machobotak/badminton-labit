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
      <body className="min-h-full bg-surface-base antialiased">
        <TopNav />
        <div className="mx-auto w-full max-w-md px-4 pb-8 sm:px-6 md:max-w-5xl md:px-8 md:pb-10">
          {children}
        </div>
        {/*
          Pengalih tema diletakkan di baris kaki yang sejajar dengan kolom isi.
          Sebelumnya ia berdiri sendiri di dalam aliran konten, sehingga
          tampak seperti tombol yang tersesat di dasar halaman.
        */}
        <div className="mx-auto flex w-full max-w-md justify-end px-4 pb-24 sm:px-6 md:max-w-5xl md:px-8 md:pb-10">
          <ThemeToggle />
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
