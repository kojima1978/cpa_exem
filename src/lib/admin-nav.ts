import {
  BookMarked,
  FileText,
  Files,
  FolderTree,
  Library,
  Settings,
  Upload,
} from "lucide-react";

export const ADMIN_NAV_ITEMS = [
  {
    href: "/admin/questions",
    label: "問題一覧",
    desc: "登録済みの問題を閲覧・編集",
    icon: FileText,
  },
  {
    href: "/admin/questions/new",
    label: "問題作成",
    desc: "問題を1問ずつ登録",
    icon: FileText,
  },
  {
    href: "/admin/import",
    label: "インポート",
    desc: "JSON/CSVで問題を一括登録",
    icon: Upload,
  },
  {
    href: "/admin/materials",
    label: "資料PDF",
    desc: "問題の元資料PDFを登録・確認",
    icon: Files,
  },
  {
    href: "/admin/subjects",
    label: "科目管理",
    desc: "財務会計論・相続税法など科目の追加・編集",
    icon: Library,
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
] as const;
