import { getCategoryLabel } from "@/components/suggestion/CategorySelector";
import { getShiftLabel } from "@/components/suggestion/ShiftSelector";
import type { ShiftType, SuggestionCategory } from "@/types/database.types";

export interface CriticalAlertPayload {
  ticketCode: string;
  shift: ShiftType;
  category: SuggestionCategory;
  message: string;
  photoUrl?: string | null;
}

export interface CriticalAlertResult {
  success: boolean;
  triggered: boolean;
  dispatched: boolean;
  reason?: string;
  error?: string;
}

/**
 * Normalized critical keywords related to food safety, hygiene, contamination, and physical hazards.
 */
export const CRITICAL_KEYWORDS: readonly string[] = [
  "descompuesto",
  "descompuesta",
  "crudo",
  "cruda",
  "intoxicacion",
  "intoxicación",
  "cuerpo extraño",
  "cuerpo extrano",
  "pelo",
  "cabello",
  "vidrio",
  "insecto",
  "mosca",
  "larva",
  "gusano",
  "cucaracha",
  "vomito",
  "vómito",
  "diarrea",
  "mal estado",
  "podrido",
  "podrida",
  "bacterias",
  "hongo",
  "moho",
];

/**
 * Normalizes text by removing diacritics and converting to lowercase for robust keyword matching.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Determines whether a suggestion meets the critical alert criteria:
 * - Belongs to category 'hygiene'
 * - OR contains critical food safety/contamination keywords
 */
export function isCriticalSuggestion(
  category: SuggestionCategory,
  message: string,
): boolean {
  if (category === "hygiene") {
    return true;
  }

  const normalizedMessage = normalizeText(message);

  return CRITICAL_KEYWORDS.some((keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    return normalizedMessage.includes(normalizedKeyword);
  });
}

/**
 * Formats a Discord-compatible Webhook payload with Crimson Heritage styling.
 */
function buildDiscordPayload(
  payload: CriticalAlertPayload,
  directUrl: string,
  categoryLabel: string,
  shiftLabel: string,
) {
  const excerpt =
    payload.message.length > 300
      ? `${payload.message.substring(0, 297)}...`
      : payload.message;

  return {
    content: "🚨 **[ALERTA COMEDOR UNSCH] Reporte Crítico Recibido**",
    embeds: [
      {
        title: `Ticket: ${payload.ticketCode}`,
        description: `Se ha registrado una incidencia de alta prioridad en el Comedor Universitario que requiere atención inmediata de la Comisión FUSCH.`,
        url: directUrl,
        color: 0x5c0000, // Crimson #5C0000
        fields: [
          {
            name: "Turno",
            value: shiftLabel,
            inline: true,
          },
          {
            name: "Categoría",
            value: categoryLabel,
            inline: true,
          },
          {
            name: "Evidencia Fotográfica",
            value: payload.photoUrl ? "Sí adjunta" : "Sin foto",
            inline: true,
          },
          {
            name: "Extracto de la Observación (Disociada)",
            value: `> "${excerpt}"`,
            inline: false,
          },
          {
            name: "Enlace de Gestión Moderador",
            value: `[Acceder al Ticket en /admin](${directUrl})`,
            inline: false,
          },
        ],
        footer: {
          text: "Sistema de Alertas FUSCH • Buzón de Sugerencias UNSCH",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Formats a Telegram Bot / Webhook markdown payload.
 */
function buildTelegramPayload(
  payload: CriticalAlertPayload,
  directUrl: string,
  categoryLabel: string,
  shiftLabel: string,
) {
  const excerpt =
    payload.message.length > 300
      ? `${payload.message.substring(0, 297)}...`
      : payload.message;

  const text =
    `🚨 *[ALERTA COMEDOR UNSCH] Reporte Crítico Recibido*\n\n` +
    `*Ticket:* \`${payload.ticketCode}\`\n` +
    `*Turno:* ${shiftLabel}\n` +
    `*Categoría:* ${categoryLabel}\n` +
    `*Evidencia:* ${payload.photoUrl ? "Sí adjunta" : "Sin foto"}\n\n` +
    `*Observación (Disociada):*\n> ${excerpt.replace(/[_*[\]()~`>#+-=|{}.!]/g, "\\$&")}\n\n` +
    `🔗 [Gestionar Ticket en Panel Admin](${directUrl})`;

  return {
    text,
    parse_mode: "MarkdownV2",
    disable_web_page_preview: false,
  };
}

/**
 * Issue 10.2 — Dispatches an automated webhook alert for critical suggestions.
 *
 * Fault-tolerant: errors are logged but NEVER bubble up to prevent disrupting
 * student submissions.
 */
export async function sendCriticalAlertWebhook(
  payload: CriticalAlertPayload,
): Promise<CriticalAlertResult> {
  try {
    const isCritical = isCriticalSuggestion(payload.category, payload.message);

    if (!isCritical) {
      return {
        success: true,
        triggered: false,
        dispatched: false,
        reason: "Suggestion does not meet criticality thresholds.",
      };
    }

    const webhookUrl =
      process.env.ALERT_WEBHOOK_URL ||
      process.env.DISCORD_WEBHOOK_URL ||
      process.env.TELEGRAM_WEBHOOK_URL;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const directUrl = `${baseUrl}/admin?search=${encodeURIComponent(payload.ticketCode)}`;
    const categoryLabel = getCategoryLabel(payload.category);
    const shiftLabel = getShiftLabel(payload.shift);

    if (!webhookUrl) {
      console.info(
        `[alertWebhook] Critical alert triggered for ${payload.ticketCode}, but no ALERT_WEBHOOK_URL is configured. Direct link: ${directUrl}`,
      );
      return {
        success: true,
        triggered: true,
        dispatched: false,
        reason: "No webhook URL configured (ALERT_WEBHOOK_URL is unset).",
      };
    }

    // Determine payload format based on destination
    let bodyPayload: unknown;
    if (webhookUrl.includes("discord.com")) {
      bodyPayload = buildDiscordPayload(payload, directUrl, categoryLabel, shiftLabel);
    } else if (webhookUrl.includes("api.telegram.org")) {
      bodyPayload = buildTelegramPayload(payload, directUrl, categoryLabel, shiftLabel);
    } else {
      // Generic JSON webhook format
      bodyPayload = {
        event: "critical_suggestion_alert",
        header: "🚨 [ALERTA COMEDOR UNSCH] Reporte Crítico Recibido",
        ticketCode: payload.ticketCode,
        shift: payload.shift,
        shiftLabel,
        category: payload.category,
        categoryLabel,
        messageExcerpt: payload.message,
        hasPhoto: Boolean(payload.photoUrl),
        photoUrl: payload.photoUrl ?? null,
        adminUrl: directUrl,
        timestamp: new Date().toISOString(),
      };
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
      // 5 second timeout to avoid hanging
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const statusText = response.statusText || `${response.status}`;
      console.warn(`[alertWebhook] Webhook response failed with status: ${statusText}`);
      return {
        success: false,
        triggered: true,
        dispatched: false,
        error: `Webhook returned status ${response.status}`,
      };
    }

    return {
      success: true,
      triggered: true,
      dispatched: true,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[alertWebhook] Error dispatching critical alert webhook:", errorMsg);
    // Return gracefully so the calling student submission NEVER fails
    return {
      success: false,
      triggered: true,
      dispatched: false,
      error: errorMsg,
    };
  }
}
