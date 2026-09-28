import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SubmissionLoadingState,
  getSubmissionStageMessage,
  type SubmissionLoadingStateProps,
} from "@/components/suggestion/SubmissionLoadingState";
import {
  SubmissionSuccessModal,
  type SubmissionSuccessModalProps,
} from "@/components/suggestion/SubmissionSuccessModal";
import { copyToClipboard } from "@/lib/utils/clipboard";
import {
  generateDemoTicketCode,
  isValidTicketCode,
  TICKET_CODE_REGEX,
} from "@/lib/utils/ticket";

function renderLoadingState(props: SubmissionLoadingStateProps) {
  return renderToStaticMarkup(createElement(SubmissionLoadingState, props));
}

function renderSuccessModal(props: SubmissionSuccessModalProps) {
  return renderToStaticMarkup(createElement(SubmissionSuccessModal, props));
}

describe("Resilient Clipboard Utility (Issue 6.6)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("copies text using modern navigator.clipboard.writeText when available", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    const originalWindow = globalThis.window;
    const originalNavigator = globalThis.navigator;

    try {
      (globalThis as unknown as { window: unknown }).window = {};
      Object.defineProperty(globalThis, "navigator", {
        value: {
          clipboard: {
            writeText: writeTextMock,
          },
        },
        configurable: true,
        writable: true,
      });

      const success = await copyToClipboard("UNSCH-K72M");
      expect(success).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith("UNSCH-K72M");
    } finally {
      globalThis.window = originalWindow;
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  it("falls back to document.execCommand when navigator.clipboard is unavailable", async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const originalNavigator = globalThis.navigator;

    try {
      (globalThis as unknown as { window: unknown }).window = {};
      Object.defineProperty(globalThis, "navigator", {
        value: {},
        configurable: true,
        writable: true,
      });

      const appendChildMock = vi.fn();
      const removeChildMock = vi.fn();
      const execCommandMock = vi.fn().mockReturnValue(true);

      const mockTextarea = {
        value: "",
        setAttribute: vi.fn(),
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
      };

      (globalThis as unknown as { document: unknown }).document = {
        createElement: vi.fn().mockReturnValue(mockTextarea),
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
        execCommand: execCommandMock,
      };

      const success = await copyToClipboard("UNSCH-AB12");
      expect(success).toBe(true);
      expect(execCommandMock).toHaveBeenCalledWith("copy");
      expect(appendChildMock).toHaveBeenCalled();
      expect(removeChildMock).toHaveBeenCalled();
    } finally {
      globalThis.window = originalWindow;
      (globalThis as unknown as { document: unknown }).document = originalDocument;
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  it("returns false when text is empty", async () => {
    const success = await copyToClipboard("");
    expect(success).toBe(false);
  });
});

describe("Demo Ticket Generator Utility", () => {
  it("generates valid UNSCH ticket codes matching TICKET_CODE_REGEX", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateDemoTicketCode();
      expect(code.startsWith("UNSCH-")).toBe(true);
      expect(code).toHaveLength(10);
      expect(TICKET_CODE_REGEX.test(code)).toBe(true);
      expect(isValidTicketCode(code)).toBe(true);
    }
  });
});

describe("SubmissionLoadingState component (Issue 6.5)", () => {
  it("returns null when stage is idle", () => {
    const html = renderLoadingState({ stage: "idle" });
    expect(html).toBe("");
  });

  it.each([
    ["uploading_media", "Subiendo evidencia fotográfica..."],
    ["submitting_rpc", "Generando ticket anónimo..."],
    ["slow_network", "Casi listo, asegurando tu reporte..."],
  ] as const)("renders stage %s with microtext %s", (stage, expectedText) => {
    const html = renderLoadingState({ stage });
    expect(html).toContain(expectedText);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("animate-spin");
  });

  it("applies amber alert styling when stage is slow_network", () => {
    const html = renderLoadingState({ stage: "slow_network" });
    expect(html).toContain("border-amber-200");
    expect(html).toContain("text-amber-900");
    expect(html).toContain("Casi listo, asegurando tu reporte...");
  });

  it("resolves correct string messages via getSubmissionStageMessage", () => {
    expect(getSubmissionStageMessage("uploading_media")).toBe("Subiendo evidencia fotográfica...");
    expect(getSubmissionStageMessage("submitting_rpc")).toBe("Generando ticket anónimo...");
    expect(getSubmissionStageMessage("slow_network")).toBe("Casi listo, asegurando tu reporte...");
    expect(getSubmissionStageMessage("idle")).toBe("Enviando tu sugerencia...");
  });
});

describe("SubmissionSuccessModal component (Issue 6.6)", () => {
  const defaultProps: SubmissionSuccessModalProps = {
    isOpen: true,
    ticketCode: "UNSCH-K72M",
    shift: "lunch",
    category: "hygiene",
    onClose: () => {},
  };

  it("renders modal with confirmation header and anonymous badge", () => {
    const html = renderSuccessModal(defaultProps);

    expect(html).toContain("¡Sugerencia registrada con éxito!");
    expect(html).toContain("Envío 100% Anónimo");
    expect(html).toContain("Tu reporte fue enviado de manera anónima");
  });

  it("prominently displays the copyable ticket code and copy button", () => {
    const html = renderSuccessModal(defaultProps);

    expect(html).toContain("CÓDIGO DE SEGUIMIENTO ANÓNIMO");
    expect(html).toContain("UNSCH-K72M");
    expect(html).toContain("Copiar código");
  });

  it("includes contextual traceability information with Spanish labels", () => {
    const html = renderSuccessModal(defaultProps);

    expect(html).toContain("Almuerzo");
    expect(html).toContain("Higiene / Limpieza");
    expect(html).toContain("Guarda este código");
  });

  it("provides follow-up actions in the footer including status lookup link", () => {
    const html = renderSuccessModal(defaultProps);

    expect(html).toContain("Cerrar y volver");
    expect(html).toContain("Consultar estado");
    expect(html).toContain("/seguimiento?code=UNSCH-K72M");
  });
});
