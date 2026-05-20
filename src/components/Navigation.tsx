"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Home,
  Settings,
  History,
  Menu,
  X,
  GraduationCap,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/practice", label: "演習", icon: BookOpen },
  { href: "/history", label: "学習履歴", icon: History },
  { href: "/admin", label: "管理", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="bg-primary-500 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <GraduationCap className="h-6 w-6" />
            <span>CPA短答ドリル</span>
          </Link>

          <nav className="hidden gap-1 md:flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/20"
                      : "hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <button
            className="rounded-lg p-2 hover:bg-white/10 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="border-t border-white/20 px-4 pb-3 md:hidden">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "bg-white/20" : "hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
    </>
  );
}
