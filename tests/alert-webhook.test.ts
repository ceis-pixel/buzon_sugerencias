import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  isCriticalSuggestion,
  normalizeText,
  sendCriticalAlertWebhook,
  type CriticalAlertPayload,
} from "@/lib/services/alertWebhook";
import type { SuggestionCategory } from "@/types/database.types";

describe("Issue 10.2: Critical Alert Webhook Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("normalizeText and isCriticalSuggestion", () => {
    it("normalizes accents and diacritics", () => {
      expect(normalizeText("INTOXICACIÓN")).toBe("intoxicacion");
      expect(normalizeText("Cuerpo Extraño")).toBe("cuerpo extrano");
      expect(normalizeText("Vómito")).toBe("vomito");
    });

    it("identifies category 'hygiene' as critical regardless of message", () => {
      expect(isCriticalSuggestion("hygiene", "Falta limpiar las bandejas")).toBe(true);
      expect(isCriticalSuggestion("hygiene", "Todo limpio hoy")).toBe(true);
    });

    it.each([
      ["menu", "La comida está descompuesta y tiene mal olor"],
      ["menu", "El pollo estaba crudo en el centro"],
      ["service", "Varios alumnos sufrieron intoxicación tras el almuerzo"],
      ["portion", "Encontré un cuerpo extraño en la sopa de hoy"],
      ["menu", "Había un pelo en el segundo plato"],
      ["infrastructure", "Había un vidrio roto cerca de la bandeja de servido"],
      ["menu", "Vi una mosca dentro del plato"],
      ["menu", "Comida en mal estado"],
      ["menu", "El pan estaba con moho verde"],
    ])("triggers critical alert for category '%s' with message '%s'", (cat, msg) => {
      expect(isCriticalSuggestion(cat as SuggestionCategory, msg)).toBe(true);
    });

    it("does not trigger critical alert for regular observations", () => {
      expect(
        isCriticalSuggestion(
          "menu",
          "Sugiero que agreguen más ensaladas y fruta en el almuerzo.",
        ),
      ).toBe(false);
      expect(
        isCriticalSuggestion(
          "portion",
          "La porción de arroz fue suficiente pero poca sopa.",
        ),
      ).toBe(false);
      expect(
        isCriticalSuggestion(
          "service",
          "El personal de atención fue muy amable.",
        ),
      ).toBe(false);
    });
  });

  describe("sendCriticalAlertWebhook dispatching and fault tolerance", () => {
    const dummyPayload: CriticalAlertPayload = {
      ticketCode: "UNSCH-7K4M",
      shift: "lunch",
      category: "hygiene",
      message: "Se encontró un insecto en el guiso de carne.",
      photoUrl: "https://example.com/media/lunch/bug.webp",
    };

    it("returns gracefully if suggestion is not critical", async () => {
      const result = await sendCriticalAlertWebhook({
        ticketCode: "UNSCH-1234",
        shift: "dinner",
        category: "menu",
        message: "Más variedad de postres por favor.",
      });

      expect(result.success).toBe(true);
      expect(result.triggered).toBe(false);
      expect(result.dispatched).toBe(false);
    });

    it("returns success: true with warning if no webhook URL is configured", async () => {
      delete process.env.ALERT_WEBHOOK_URL;
      delete process.env.DISCORD_WEBHOOK_URL;
      delete process.env.TELEGRAM_WEBHOOK_URL;

      const result = await sendCriticalAlertWebhook(dummyPayload);

      expect(result.success).toBe(true);
      expect(result.triggered).toBe(true);
      expect(result.dispatched).toBe(false);
      expect(result.reason).toContain("No webhook URL configured");
    });

    it("dispatches Discord embed payload when discord webhook URL is used", async () => {
      process.env.ALERT_WEBHOOK_URL = "https://discord.com/api/webhooks/123/xyz";

      let capturedBody: { content?: string; embeds?: Array<{ title?: string; color?: number }> } = {};
      globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
        capturedBody = JSON.parse(init.body);
        return {
          ok: true,
          status: 204,
          statusText: "No Content",
        };
      });

      const result = await sendCriticalAlertWebhook(dummyPayload);

      expect(result.success).toBe(true);
      expect(result.dispatched).toBe(true);
      expect(capturedBody.content).toContain("[ALERTA COMEDOR UNSCH] Reporte Crítico Recibido");
      expect(capturedBody.embeds?.[0]?.title).toBe("Ticket: UNSCH-7K4M");
      expect(capturedBody.embeds?.[0]?.color).toBe(0x5c0000); // Crimson institutional
    });

    it("dispatches Telegram markdown payload when telegram webhook URL is used", async () => {
      process.env.ALERT_WEBHOOK_URL = "https://api.telegram.org/bot12345/sendMessage";

      let capturedBody: { text?: string; parse_mode?: string } = {};
      globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
        capturedBody = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          statusText: "OK",
        };
      });

      const result = await sendCriticalAlertWebhook(dummyPayload);

      expect(result.success).toBe(true);
      expect(result.dispatched).toBe(true);
      expect(capturedBody.text).toContain("[ALERTA COMEDOR UNSCH] Reporte Crítico Recibido");
      expect(capturedBody.text).toContain("UNSCH-7K4M");
      expect(capturedBody.parse_mode).toBe("MarkdownV2");
    });

    it("is fault-tolerant and does not throw if webhook server responds with 500 error", async () => {
      process.env.ALERT_WEBHOOK_URL = "https://example.com/webhook";

      globalThis.fetch = vi.fn().mockImplementation(async () => ({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      }));

      const result = await sendCriticalAlertWebhook(dummyPayload);

      expect(result.success).toBe(false);
      expect(result.triggered).toBe(true);
      expect(result.dispatched).toBe(false);
      expect(result.error).toContain("500");
    });

    it("is fault-tolerant and catches network drop/timeout without rethrowing", async () => {
      process.env.ALERT_WEBHOOK_URL = "https://example.com/webhook";

      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network connection lost"));

      const result = await sendCriticalAlertWebhook(dummyPayload);

      expect(result.success).toBe(false);
      expect(result.triggered).toBe(true);
      expect(result.dispatched).toBe(false);
      expect(result.error).toBe("Network connection lost");
    });
  });
});
