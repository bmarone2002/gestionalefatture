"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, LayoutDashboard, Users, FileText } from "lucide-react";
import { cn } from "cn";
import { logoutAction } from "@/server/actions/auth";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clienti", icon: Users },
  { href: "/invoices", label: "Fatture", icon: FileText },
];

export function AppSidebar({
  userName,
  alertCount,
}: {
  userName: string;
  alertCount: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full min-h-screen w-60 shrink-0 flex-col bg-[#1c2b38] text-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-md bg-white/10">
          <Archive className="size-5" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-wide">Archivia</div>
          <div className="text-[11px] text-white/60">Gestionale stoccaggio</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {links.map((link) => {
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4" />
                {link.label}
              </span>
              {link.href === "/invoices" && alertCount > 0 ? (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  {alertCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <div className="text-xs text-white/60">Operatore</div>
        <div className="truncate text-sm">{userName}</div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="mt-3 text-xs text-white/70 underline-offset-2 hover:text-white hover:underline"
          >
            Esci
          </button>
        </form>
      </div>
    </aside>
  );
}
