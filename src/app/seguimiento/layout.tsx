import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seguimiento de Sugerencias · Comedor UNSCH",
  description:
    "Consulta el estado de tu sugerencia anónima al Comedor Universitario de la UNSCH usando tu código de seguimiento personal. Sin inicio de sesión requerido.",
};

export default function SeguimientoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
