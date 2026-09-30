"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShuttlecockIcon } from "./icons";

const HIDDEN = ["/", "/login", "/register"];

export default function TopNav() {
  const path = usePathname();
  if (HIDDEN.some((p) => path === p) || path.startsWith("/s/")) return null;
  const item = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-extrabold ${
        active
          ? "bg-primary text-white shadow-teal-glow"
          : "text-primary-dark hover:bg-primary-bg"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="hidden md:block sticky top-0 z-20 border-b border-primary-light/40 bg-surface-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-xl font-extrabold text-primary-dark">
          <ShuttlecockIcon className="h-6 w-6" />
          Badminton Split
        </Link>
        <nav className="flex items-center gap-2">
          {item("/dashboard", "Dashboard", path === "/dashboard")}
          {item("/sessions/new", "Buat Sesi", path === "/sessions/new")}
          {item("/profile", "Profil", path === "/profile")}
        </nav>
      </div>
    </header>
  );
}
