import { requireUser } from "@/server/require-user";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getNavAlertCount } from "@/server/services/invoices";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const alertCount = await getNavAlertCount();

  return (
    <div className="flex min-h-screen bg-[#f4f1ea]">
      <AppSidebar userName={user.name ?? user.email ?? "Amministratore"} alertCount={alertCount} />
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
