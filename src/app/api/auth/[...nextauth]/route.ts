import NextAuth from "next-auth";

import { getAuthOptions } from "@/lib/auth/authOptions";
import { InfrastructureEnvironmentError } from "@/lib/server-env";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ nextauth: string[] }> };

/**
 * NextAuth endpoints (/api/auth/signin, /callback/google, /session, /signout...).
 * Options are resolved per request so no credential is needed at build time.
 */
async function handler(request: Request, context: RouteContext): Promise<Response> {
  try {
    return await NextAuth(request as never, context as never, getAuthOptions());
  } catch (error) {
    if (error instanceof InfrastructureEnvironmentError) {
      console.error("[auth] Configuración incompleta:", error.message);
      return Response.json(
        {
          error: {
            code: "AUTH_UNAVAILABLE",
            message: "El servicio de autenticación institucional no está configurado.",
          },
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }
}

export { handler as GET, handler as POST };
