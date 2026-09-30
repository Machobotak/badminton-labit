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
      className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
        active ? "text-primary" : "text-primary-dark/60"
      }`}
    >
      <span className="leading-none">{icon}</span>
      {label}
    </Link>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-primary-light/40 bg-surface-card md:hidden">
      <div className="mx-auto flex max-w-md px-2">
        {item("/dashboard", "Dashboard", <HomeIcon className="h-5 w-5" />, path === "/dashboard")}
        {item("/sessions/new", "Buat", <PlusIcon className="h-5 w-5" />, path === "/sessions/new")}
        {item("/profile", "Profil", <UserIcon className="h-5 w-5" />, path === "/profile")}
      </div>
    </nav>
  );
}
