"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Upload,
  FolderTree,
  BookMarked,
  Settings,
} from "lucide-react";

const ADMIN_LINKS = [
  { href: "/admin/questions", label: "問題一覧", icon: FileText },
  { href: "/admin/questions/new", label: "問題作成", icon: FileText },
  { href: "/admin/import", label: "インポート", icon: Upload },
  { href: "/admin/topics", label: "分野管理", icon: FolderTree },
  { href: "/admin/sessions", label: "学習単位管理", icon: BookMarked },
  { href: "/admin/settings", label: "設定", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {ADMIN_LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary-50 text-primary-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
