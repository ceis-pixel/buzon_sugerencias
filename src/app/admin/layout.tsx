import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { UnauthorizedAccessState } from "@/components/admin/UnauthorizedAccessState";
import { createClient } from "@/lib/supabase/server";
import type { AdminRow } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Panel de Gestión y Moderación FUSCH • Comedor UNSCH",
  description:
    "Módulo administrativo exclusivo para la Secretaría de Salud y Nutrición de la FUSCH. Moderación, seguimiento y atención de sugerencias del comedor universitario.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If no active session exists, redirect to login with returnUrl
  if (authError || !user) {
    redirect("/login?returnUrl=/admin");
  }

  // Check if authenticated email exists in the admins whitelist and is active
  const { data: adminRecord, error: adminError } = await supabase
    .from("admins")
    .select("*")
    .eq("email", user.email?.toLowerCase() ?? "")
    .eq("is_active", true)
    .maybeSingle();

  // If user is authenticated but not an active administrator, display didactic 403 screen
  if (adminError || !adminRecord) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col justify-center">
        <UnauthorizedAccessState userEmail={user.email ?? "Desconocido"} />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans antialiased text-gray-900">
      <AdminHeader admin={adminRecord as AdminRow} />
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}
