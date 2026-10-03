"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { HomeIcon, PlusIcon, UserIcon } from "./icons";

const HIDDEN = ["/", "/login", "/register"];

export default function BottomNav() {
  const path = usePathname();
  if (HIDDEN.some((p) => path === p) || path.startsWith("/s/")) return null;
  const item = (href: string, label: string, icon: ReactNode, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`press flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium ${
        active ? "text-accent" : "text-white/70"
      }`}
    >
      <span className="leading-none">{icon}</span>
      {label}
    </Link>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#08322e] pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-md px-2 py-1">
        {item("/dashboard", "Dashboard", <HomeIcon className="h-5 w-5" />, path === "/dashboard")}
        {item("/sessions/new", "Buat", <PlusIcon className="h-5 w-5" />, path === "/sessions/new")}
        {item("/profile", "Profil", <UserIcon className="h-5 w-5" />, path === "/profile")}
      </div>
    </nav>
  );
}
