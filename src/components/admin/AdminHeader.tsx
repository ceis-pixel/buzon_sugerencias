"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ExternalLink,
  Inbox,
  LogOut,
  QrCode,
  ShieldCheck,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { LogoutModal } from "@/components/auth/LogoutModal";
import type { AdminRow } from "@/types/database.types";

export interface AdminHeaderProps {
  admin: AdminRow;
}

const NAV_ITEMS: readonly { href: string; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Bandeja de Reportes", shortLabel: "Bandeja", icon: Inbox },
  { href: "/admin/menus", label: "Gestión de Menús", shortLabel: "Menús", icon: UtensilsCrossed },
  { href: "/admin/analitica", label: "Analítica de Impacto", shortLabel: "Analítica", icon: BarChart3 },
];

const actionClasses =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-neutral-gray/25 px-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-slate-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

function getInitials(admin: AdminRow): string {
  const source = admin.full_name?.trim() || admin.email;
  const words = source.split(/[\s.@_-]+/).filter(Boolean);
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}

/**
 * Operational top bar of the JVC console: brand, section tabs, the signed-in
 * moderator, a shortcut to the printable QR flyer and the secure logout.
 */
export function AdminHeader({ admin }: AdminHeaderProps) {
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-gray/20 bg-white/95 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            aria-label="Consola de fiscalización de la JVC, ir a la bandeja"
            className="flex min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold tracking-tight text-gray-900">
                Comedor UNSCH
              </span>
              <span className="block truncate text-[11px] font-semibold text-primary">
                Junta de Vigilancia (JVC)
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/qr-flyer"
              target="_blank"
              rel="noreferrer"
              aria-label="Imprimir afiche QR"
              title="Abrir el afiche con código QR para imprimir"
              className={actionClasses}
            >
              <QrCode aria-hidden="true" className="size-4" />
              <span className="hidden md:inline">Afiche QR</span>
            </Link>

            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir el portal público"
              title="Abrir la vista pública del buzón en una pestaña nueva"
              className={`${actionClasses} hidden lg:inline-flex`}
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              <span>Portal Público</span>
            </Link>

            <div
              className="flex items-center gap-2 rounded-xl border border-neutral-gray/20 bg-slate-50 py-1 pl-1 pr-1 sm:pr-3"
              title={`${admin.full_name || "Moderador JVC"} · ${admin.email}`}
            >
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-extrabold uppercase text-white"
              >
                {getInitials(admin)}
              </span>
              <span className="hidden min-w-0 flex-col sm:flex">
                <span className="flex items-center gap-1.5">
                  <span className="max-w-[11rem] truncate text-xs font-bold leading-tight text-gray-900">
                    {admin.full_name || "Moderador JVC"}
                  </span>
                  <span className="rounded bg-primary/15 px-1.5 text-[10px] font-extrabold uppercase text-primary">
                    {admin.role === "admin" ? "Admin" : "Moderador"}
                  </span>
                </span>
                <span className="max-w-[14rem] truncate text-[11px] text-neutral-gray">
                  {admin.email}
                </span>
              </span>
              <span className="sr-only sm:hidden">
                Sesión de {admin.full_name || "moderador JVC"}, {admin.email}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsLogoutOpen(true)}
              aria-label="Cerrar sesión institucional"
              title="Cerrar sesión"
              className={`${actionClasses} hover:border-primary/40 hover:bg-primary/5 hover:text-primary`}
            >
              <LogOut aria-hidden="true" className="size-4" />
              <span className="hidden md:inline">Salir</span>
            </button>
          </div>
        </div>

        <nav
          aria-label="Secciones del panel"
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:flex-none ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-neutral-gray hover:border-neutral-gray/30 hover:text-gray-900"
                }`}
              >
                <Icon aria-hidden="true" className="size-4" />
                <span className="sm:hidden">{item.shortLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <LogoutModal isOpen={isLogoutOpen} onClose={() => setIsLogoutOpen(false)} />
    </>
  );
}
