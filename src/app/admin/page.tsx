import Link from "next/link";
import { FileText, Upload, FolderTree, BookMarked, Settings } from "lucide-react";

const CARDS = [
  {
    href: "/admin/questions",
    label: "問題一覧",
    desc: "登録済みの問題を閲覧・編集",
    icon: FileText,
  },
  {
    href: "/admin/import",
    label: "インポート",
    desc: "JSON/CSVで問題を一括登録",
    icon: Upload,
  },
  {
    href: "/admin/topics",
    label: "分野管理",
    desc: "問題の分野を追加・編集",
    icon: FolderTree,
  },
  {
    href: "/admin/sessions",
    label: "学習単位管理",
    desc: "基準・単元の追加・編集",
    icon: BookMarked,
  },
  {
    href: "/admin/settings",
    label: "設定",
    desc: "バックアップ・復元",
    icon: Settings,
  },
];

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-xl font-bold">管理画面</h1>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {CARDS.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold">{label}</div>
              <div className="mt-0.5 text-sm text-gray-500">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
