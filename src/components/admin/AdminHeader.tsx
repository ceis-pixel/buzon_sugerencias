"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ExternalLink,
  Inbox,
  LogOut,
  User,
  UtensilsCrossed,
} from "lucide-react";

import { Button } from "@/components/common/Button";
import { LogoutModal } from "@/components/auth/LogoutModal";
import type { AdminRow } from "@/types/database.types";

export interface AdminHeaderProps {
  admin: AdminRow;
}

/**
 * Issue 8.2 & 10.1 — AdminHeader (Client Component)
 *
 * Top navigation bar exclusive for FUSCH evaluators and administrators:
 * - Brand monogram with institutional badge: "Comedor UNSCH • Panel de Gestión FUSCH".
 * - Internal navigation tabs: "Bandeja" (/admin) and "Analítica de Impacto" (/admin/analitica).
 * - Identity pill with administrator name and role badge.
 * - Quick link to public portal.
 * - Secure logout action with LogoutModal.
 */
export function AdminHeader({ admin }: AdminHeaderProps) {
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const pathname = usePathname();

  const isAnalitica = pathname.startsWith("/admin/analitica");
  const isInbox = pathname === "/admin";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-gray/20 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Brand & Monogram */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
              aria-label="Ir al panel de administración"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
                <UtensilsCrossed className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="font-sans text-sm font-extrabold tracking-tight text-gray-900 sm:text-base">
                  Comedor UNSCH
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  Panel de Gestión FUSCH
                </span>
              </div>
            </Link>

            {/* Admin Nav Tabs */}
            <nav
              aria-label="Navegación del panel"
              className="hidden sm:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-neutral-gray/15"
            >
              <Link
                href="/admin"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isInbox
                    ? "bg-white text-primary shadow-xs"
                    : "text-neutral-gray hover:text-gray-900 hover:bg-slate-200/50"
                }`}
              >
                <Inbox className="h-3.5 w-3.5" />
                <span>Bandeja</span>
              </Link>
              <Link
                href="/admin/analitica"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isAnalitica
                    ? "bg-white text-primary shadow-xs"
                    : "text-neutral-gray hover:text-gray-900 hover:bg-slate-200/50"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Analítica de Impacto</span>
              </Link>
            </nav>
          </div>

          {/* User profile & controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Tab Toggle */}
            <div className="sm:hidden flex items-center gap-1">
              <Link
                href="/admin"
                className={`p-2 rounded-xl text-xs font-semibold ${
                  isInbox ? "bg-primary/10 text-primary" : "text-neutral-gray"
                }`}
                title="Bandeja de moderación"
              >
                <Inbox className="h-4 w-4" />
              </Link>
              <Link
                href="/admin/analitica"
                className={`p-2 rounded-xl text-xs font-semibold ${
                  isAnalitica ? "bg-primary/10 text-primary" : "text-neutral-gray"
                }`}
                title="Analítica de impacto"
              >
                <BarChart3 className="h-4 w-4" />
              </Link>
            </div>

            {/* Link to public portal */}
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-neutral-gray/25 px-3 py-1.5 text-xs font-semibold text-neutral-gray transition-colors hover:bg-slate-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Abrir vista pública del buzón en nueva pestaña"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Portal Público</span>
            </Link>

            {/* Moderator Identity Pill */}
            <div className="flex items-center gap-2.5 rounded-xl border border-neutral-gray/20 bg-slate-50/80 px-3 py-1.5 text-left">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="h-4 w-4 stroke-[2.2]" />
              </div>
              <div className="hidden md:flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900 leading-tight">
                    {admin.full_name || "Moderador FUSCH"}
                  </span>
                  <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[10px] font-extrabold text-primary uppercase">
                    {admin.role === "admin" ? "Admin" : "Moderador"}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-gray truncate max-w-[180px]">
                  {admin.email}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLogoutOpen(false || true)}
              leftIcon={<LogOut className="h-4 w-4" />}
              className="text-neutral-gray hover:text-primary hover:bg-primary/5"
              aria-label="Cerrar sesión institucional"
            >
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Secure Logout Modal */}
      <LogoutModal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
      />
    </>
  );
}
