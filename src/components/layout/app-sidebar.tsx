"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Users, FileText, Menu, LogOut } from "lucide-react";
import { cn } from "cn";
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandWordmarkDark, BrandWordmarkLight } from "@/components/brand/logo";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clienti", icon: Users },
  { href: "/invoices", label: "Fatture", icon: FileText },
];

function NavLinks({
  pathname,
  alertCount,
  onNavigate,
}: {
  pathname: string;
  alertCount: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-white shadow-[inset_3px_0_0_0_var(--brand)]"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <span className="flex items-center gap-2.5">
              <Icon
                className={cn(
                  "size-4 transition-colors",
                  active ? "text-brand" : "text-white/50 group-hover:text-white/80",
                )}
              />
              {link.label}
            </span>
            {link.href === "/invoices" && alertCount > 0 ? (
              <span className="rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {alertCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <Link
      href="/"
      className="block border-b border-white/10 px-4 py-5 transition-opacity hover:opacity-90"
    >
      <BrandWordmarkDark />
      <p className="mt-2.5 text-[11px] tracking-wide text-white/45">Gestionale stoccaggio</p>
    </Link>
  );
}

function SidebarFooter({ userName }: { userName: string }) {
  return (
    <div className="mt-auto border-t border-white/10 px-4 py-4">
      <div className="text-[11px] uppercase tracking-wider text-white/45">Operatore</div>
      <div className="mt-0.5 truncate text-sm text-white/90">{userName}</div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/65 transition-colors hover:text-brand"
        >
          <LogOut className="size-3.5" />
          Esci
        </button>
      </form>
    </div>
  );
}

function SidebarBody({
  userName,
  alertCount,
  pathname,
  onNavigate,
}: {
  userName: string;
  alertCount: number;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <SidebarBrand />
      <div className="py-4">
        <NavLinks pathname={pathname} alertCount={alertCount} onNavigate={onNavigate} />
      </div>
      <SidebarFooter userName={userName} />
    </>
  );
}

export function AppSidebar({
  userName,
  alertCount,
}: {
  userName: string;
  alertCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — sticky, no scroll bleed */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto bg-sidebar text-sidebar-foreground lg:flex">
        <SidebarBody userName={userName} alertCount={alertCount} pathname={pathname} />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="outline" size="icon" aria-label="Apri menu" />}
          >
            <Menu className="size-4" />
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-72 border-0 bg-sidebar p-0 text-sidebar-foreground"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col">
              <SidebarBody
                userName={userName}
                alertCount={alertCount}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
        <BrandWordmarkLight />
      </div>
    </>
  );
}
