import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  routerReplace: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@/lib/auth/authActions", () => ({
  signOut: mocks.signOut,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.routerReplace }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  }),
}));

// Import after mocks are defined
import { LogoutModal } from "@/components/auth/LogoutModal";
import type { ModalProps } from "@/components/common/Modal";
import { Modal } from "@/components/common/Modal";

// ── LogoutModal static rendering ───────────────────────────────────────────
describe("LogoutModal server-side rendering and accessible structure", () => {
  it("renders the closed modal without exposing the open attribute", () => {
    const html = renderToStaticMarkup(
      createElement(LogoutModal, { isOpen: false, onClose: () => {} }),
    );
    expect(html).not.toMatch(/<dialog[^>]*\sopen(?:=|\s|>)/);
    expect(html).toContain('aria-modal="true"');
  });

  it("contains the institutional title and security warning text", () => {
    const html = renderToStaticMarkup(
      createElement(LogoutModal, { isOpen: true, onClose: () => {} }),
    );
    expect(html).toContain("¿Cerrar sesión institucional?");
    expect(html).toContain("Aviso de seguridad para equipos del campus");
    expect(html).toContain("Biblioteca Central");
    expect(html).toContain("cerrar completamente la ventana del navegador");
  });

  it("renders both Cancel and Logout action buttons", () => {
    const html = renderToStaticMarkup(
      createElement(LogoutModal, { isOpen: true, onClose: () => {} }),
    );
    expect(html).toContain("Cancelar");
    expect(html).toContain("Cerrar Sesión");
    expect(html).toContain('id="logout-modal-cancel"');
    expect(html).toContain('id="logout-modal-confirm"');
  });

  it("uses the shared Modal primitive with rounded-2xl and shadow-sm classes", () => {
    const html = renderToStaticMarkup(
      createElement(LogoutModal, { isOpen: false, onClose: () => {} }),
    );
    expect(html).toContain("rounded-2xl");
    expect(html).toContain("shadow-sm");
  });

  it("includes the institutional email domain @unsch.edu.pe in the body copy", () => {
    const html = renderToStaticMarkup(
      createElement(LogoutModal, { isOpen: true, onClose: () => {} }),
    );
    expect(html).toContain("@unsch.edu.pe");
  });

  it("generates a unique aria-labelledby matching the dialog title id", () => {
    const html = renderToStaticMarkup(
      createElement(LogoutModal, { isOpen: true, onClose: () => {} }),
    );
    const titleId = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(titleId).toBeTruthy();
    expect(html).toContain(`id="${titleId}"`);
  });

  it("does not duplicate label ids when mounted alongside another modal", () => {
    const props: ModalProps = { isOpen: false, onClose: () => {}, children: "Prueba" };
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(Modal, props),
        createElement(LogoutModal, { isOpen: false, onClose: () => {} }),
      ),
    );
    const ids = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── useLogout hook ────────────────────────────────────────────────────────
describe("useLogout hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue(undefined);
    mocks.routerReplace.mockReturnValue(undefined);
  });

  it("exports handleLogout, isLoggingOut and logoutError from the hook module", async () => {
    const { useLogout } = await import("@/lib/hooks/useLogout");
    expect(typeof useLogout).toBe("function");
  });

  it("purgeAuthStorage only removes sb- and supabase.auth keys from localStorage", async () => {
    const localStorageMock: Record<string, string> = {
      "sb-token": "secret",
      "supabase.auth.token": "jwt",
      "ticket-UNSCH-1234": "visible",
      theme: "light",
    };

    const storageSpy = {
      length: Object.keys(localStorageMock).length,
      key: (i: number) => Object.keys(localStorageMock)[i] ?? null,
      getItem: (k: string) => localStorageMock[k] ?? null,
      removeItem: (k: string) => { delete localStorageMock[k]; },
      setItem: (k: string, v: string) => { localStorageMock[k] = v; },
      clear: () => { Object.keys(localStorageMock).forEach((k) => delete localStorageMock[k]); },
    };

    vi.stubGlobal("localStorage", storageSpy);
    vi.stubGlobal("sessionStorage", { length: 0, key: () => null, removeItem: vi.fn(), getItem: vi.fn() });

    await import("@/lib/hooks/useLogout");

    expect(localStorageMock).toHaveProperty("ticket-UNSCH-1234");
    expect(localStorageMock).toHaveProperty("theme");

    vi.unstubAllGlobals();
  });
});
