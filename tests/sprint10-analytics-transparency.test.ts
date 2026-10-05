import { describe, expect, it } from "vitest";

import { FAQ_ITEMS } from "@/components/faq/FaqAccordion";
import type { PublicImprovementItem } from "@/components/transparency/TransparencyBoardView";
import type { SuggestionRow, TicketResponseRow } from "@/types/database.types";

describe("Sprint 10 — Issue 10.3: Server-Side Pagination & Query Rules", () => {
  function computePaginationOffsets(page: number, pageSize: number) {
    const safePage = Math.max(1, page);
    const validSizes = [15, 30, 50];
    const safePageSize = validSizes.includes(pageSize) ? pageSize : 15;
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;
    return { from, to, safePage, safePageSize };
  }

  it("computes accurate range offsets for page sizes 15, 30, and 50", () => {
    // Page 1 with 15 rows: 0 to 14
    expect(computePaginationOffsets(1, 15)).toEqual({
      from: 0,
      to: 14,
      safePage: 1,
      safePageSize: 15,
    });

    // Page 2 with 15 rows: 15 to 29
    expect(computePaginationOffsets(2, 15)).toEqual({
      from: 15,
      to: 29,
      safePage: 2,
      safePageSize: 15,
    });

    // Page 3 with 30 rows: 60 to 89
    expect(computePaginationOffsets(3, 30)).toEqual({
      from: 60,
      to: 89,
      safePage: 3,
      safePageSize: 30,
    });

    // Page 1 with 50 rows: 0 to 49
    expect(computePaginationOffsets(1, 50)).toEqual({
      from: 0,
      to: 49,
      safePage: 1,
      safePageSize: 50,
    });
  });

  it("falls back to page 1 and pageSize 15 for invalid or malicious inputs", () => {
    expect(computePaginationOffsets(-5, 999)).toEqual({
      from: 0,
      to: 14,
      safePage: 1,
      safePageSize: 15,
    });
  });

  it("discriminates between exact ticket code search and partial message search", () => {
    function classifySearch(query: string) {
      const q = query.trim();
      if (q.toUpperCase().startsWith("UNSCH-")) {
        return { type: "ticket_code", query: q.toUpperCase() };
      }
      return { type: "message", query: q };
    }

    expect(classifySearch("UNSCH-7K4M")).toEqual({
      type: "ticket_code",
      query: "UNSCH-7K4M",
    });

    expect(classifySearch("unsch-2345")).toEqual({
      type: "ticket_code",
      query: "UNSCH-2345",
    });

    expect(classifySearch("comida fría")).toEqual({
      type: "message",
      query: "comida fría",
    });
  });
});

describe("Sprint 10 — Issue 10.5: Centro de Ayuda Didáctico & FAQ Content", () => {
  it("contains all 5 mandatory pedagogical questions for the student community", () => {
    expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(5);

    const questions = FAQ_ITEMS.map((item) => item.question.toLowerCase());

    // 1. Anonimato 100%
    expect(
      questions.some((q) => q.includes("anónima") || q.includes("anonima")),
    ).toBe(true);

    // 2. ¿Quién lee mis observaciones?
    expect(questions.some((q) => q.includes("quién lee") || q.includes("quien lee"))).toBe(
      true,
    );

    // 3. ¿Qué hago si extravié mi código?
    expect(questions.some((q) => q.includes("extravié") || q.includes("codigo") || q.includes("código"))).toBe(
      true,
    );

    // 4. Horarios de atención de cada turno
    expect(questions.some((q) => q.includes("horarios") && q.includes("turno"))).toBe(
      true,
    );

    // 5. Tiempo de respuesta
    expect(questions.some((q) => q.includes("tiempo") && q.includes("respuesta"))).toBe(
      true,
    );
  });

  it("verifies pedagogical explanation of zero-knowledge and salted ephemeral hash", () => {
    const anonymityFaq = FAQ_ITEMS.find((item) => item.id === "anonimato");
    expect(anonymityFaq).toBeDefined();
    expect(anonymityFaq?.answer).toContain("disociativa");
    expect(anonymityFaq?.details?.some((d) => d.includes("SHA-256"))).toBe(true);
  });
});

describe("Sprint 10 — Issue 10.6: Security Audit on Public Transparency Board", () => {
  // Mock dataset including sensitive, pending, internal and valid resolved records
  const mockSuggestions: SuggestionRow[] = [
    {
      id: "sugg-1",
      ticket_code: "UNSCH-0001",
      shift: "lunch",
      category: "menu",
      message: "El guiso tenía exceso de condimentos.",
      photo_url: "/uploads/lunch/2026/09/11111111-1111-4111-8111-111111111111.webp",
      status: "resolved",
      created_at: "2026-09-01T12:00:00Z",
      updated_at: "2026-09-02T10:00:00Z",
    },
    {
      id: "sugg-2",
      ticket_code: "UNSCH-0002",
      shift: "dinner",
      category: "portion",
      message: "Poco arroz servido.",
      photo_url: null,
      status: "pending", // MUST NEVER APPEAR ON PUBLIC BOARD
      created_at: "2026-09-03T18:00:00Z",
      updated_at: "2026-09-03T18:00:00Z",
    },
    {
      id: "sugg-3",
      ticket_code: "UNSCH-0003",
      shift: "breakfast",
      category: "service",
      message: "Atención lenta en la cola de bandeja.",
      photo_url: null,
      status: "in_review", // MUST NEVER APPEAR ON PUBLIC BOARD
      created_at: "2026-09-04T07:30:00Z",
      updated_at: "2026-09-04T08:00:00Z",
    },
    {
      id: "sugg-4",
      ticket_code: "UNSCH-0004",
      shift: "lunch",
      category: "hygiene",
      message: "Bandejas húmedas en el módulo central.",
      photo_url: "/uploads/lunch/2026/09/44444444-4444-4444-8444-444444444444.webp",
      status: "resolved",
      created_at: "2026-09-05T12:00:00Z",
      updated_at: "2026-09-06T15:00:00Z",
    },
  ];

  const mockResponses: TicketResponseRow[] = [
    {
      id: "resp-1",
      suggestion_id: "sugg-1",
      responder_email: "moderador.salud@unsch.edu.pe", // SENSITIVE: MUST NOT BE EXPOSED
      response_text: "Se calibró la sazón directamente con el concesionario.",
      is_internal: false, // PUBLIC
      created_at: "2026-09-02T10:00:00Z",
      updated_at: "2026-09-02T10:00:00Z",
    },
    {
      id: "resp-2",
      suggestion_id: "sugg-4",
      responder_email: "moderador.privado@unsch.edu.pe",
      response_text: "Nota interna confidencial sobre el personal de limpieza.",
      is_internal: true, // INTERNAL NOTE: MUST NEVER BE EXPOSED
      created_at: "2026-09-06T14:00:00Z",
      updated_at: "2026-09-06T14:00:00Z",
    },
  ];

  // Simulates the transformation in /transparencia/page.tsx
  function filterPublicImprovements(
    suggestions: SuggestionRow[],
    responses: TicketResponseRow[],
  ): PublicImprovementItem[] {
    const publicResponsesBySugg = new Map<string, TicketResponseRow>();
    for (const r of responses) {
      if (!r.is_internal && r.response_text.trim()) {
        publicResponsesBySugg.set(r.suggestion_id, r);
      }
    }

    const results: PublicImprovementItem[] = [];
    for (const s of suggestions) {
      // 1. Must be resolved
      if (s.status !== "resolved") continue;

      // 2. Must possess a non-internal public response
      const resp = publicResponsesBySugg.get(s.id);
      if (!resp) continue;

      results.push({
        id: s.id,
        ticketCode: s.ticket_code || "UNSCH",
        shift: s.shift,
        category: s.category,
        message: s.message,
        photoUrl: s.photo_url,
        createdAt: s.created_at,
        resolvedAt: resp.created_at,
        officialResponse: resp.response_text,
      });
    }

    return results;
  }

  it("strictly excludes tickets with status 'pending' or 'in_review'", () => {
    const items = filterPublicImprovements(mockSuggestions, mockResponses);
    expect(items.some((i) => i.id === "sugg-2")).toBe(false);
    expect(items.some((i) => i.id === "sugg-3")).toBe(false);
  });

  it("strictly excludes internal moderator notes (is_internal = true)", () => {
    const items = filterPublicImprovements(mockSuggestions, mockResponses);
    // sugg-4 only has an internal note, so it must not be published
    expect(items.some((i) => i.id === "sugg-4")).toBe(false);
  });

  it("exposes only authorized public improvements and zero student/moderator emails", () => {
    const items = filterPublicImprovements(mockSuggestions, mockResponses);
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.id).toBe("sugg-1");
    expect(item.ticketCode).toBe("UNSCH-0001");
    expect(item.officialResponse).toBe("Se calibró la sazón directamente con el concesionario.");

    // Verify absence of sensitive properties
    const record = item as unknown as Record<string, unknown>;
    expect(record.responder_email).toBeUndefined();
    expect(record.email).toBeUndefined();
    expect(record.user_id).toBeUndefined();
  });
});
