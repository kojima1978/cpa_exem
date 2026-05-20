import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <aside className="w-full shrink-0 md:w-52">
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <h2 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            管理メニュー
          </h2>
          <AdminSidebar />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
