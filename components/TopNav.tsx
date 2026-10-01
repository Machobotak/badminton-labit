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
      aria-current={active ? "page" : undefined}
      className={`press rounded-full px-3.5 py-2 text-sm font-semibold ${
        active
          ? "bg-primary text-on-solid"
          : "text-fg-muted hover:bg-neutral-bg hover:text-fg"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-20 hidden border-b border-border bg-surface-card/95 backdrop-blur md:block">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-base font-semibold text-fg"
        >
          <ShuttlecockIcon className="h-5 w-5 text-primary" />
          Badminton Split
        </Link>
        <nav className="flex items-center gap-1">
          {item("/dashboard", "Dashboard", path === "/dashboard")}
          {item("/sessions/new", "Buat Sesi", path === "/sessions/new")}
          {item("/profile", "Profil", path === "/profile")}
        </nav>
      </div>
    </header>
  );
}
