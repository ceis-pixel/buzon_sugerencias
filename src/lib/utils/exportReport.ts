import * as XLSX from "xlsx";

import { getCategoryLabel } from "@/components/suggestion/CategorySelector";
import { getShiftLabel } from "@/components/suggestion/ShiftSelector";
import type { SuggestionRow, TicketResponseRow } from "@/types/database.types";

export interface SuggestionWithResponse extends SuggestionRow {
  latest_response?: TicketResponseRow | null;
  responses?: TicketResponseRow[];
}

export interface FormattedReportRow {
  "Código Ticket": string;
  "Fecha de Registro": string;
  Turno: string;
  Categoría: string;
  "Observación del Estudiante": string;
  "Tiene Evidencia Fotográfica (Sí/No)": "Sí" | "No";
  "URL Foto": string;
  Estado: string;
  "Fecha de Atención": string;
  "Respuesta Oficial": string;
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  resolved: "Atendido",
};

/**
 * Formats ISO date string to Peruvian local date & time (America/Lima).
 */
export function formatPeruvianDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("es-PE", {
      timeZone: "America/Lima",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Returns today's date formatted as YYYY-MM-DD in America/Lima timezone.
 */
export function getPeruvianDateStamp(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Maps raw suggestion data into formal rows conforming to Issue 8.6 specifications.
 */
export function mapSuggestionsToReportRows(
  suggestions: SuggestionWithResponse[],
): FormattedReportRow[] {
  return suggestions.map((item) => {
    const latestResponse =
      item.latest_response ||
      (item.responses && item.responses.length > 0
        ? item.responses[item.responses.length - 1]
        : null);

    const resolvedDate =
      item.status === "resolved"
        ? latestResponse?.created_at || item.updated_at
        : "";

    return {
      "Código Ticket": item.ticket_code ?? "S/C",
      "Fecha de Registro": formatPeruvianDateTime(item.created_at),
      Turno: getShiftLabel(item.shift),
      Categoría: getCategoryLabel(item.category),
      "Observación del Estudiante": item.message,
      "Tiene Evidencia Fotográfica (Sí/No)": item.photo_url ? "Sí" : "No",
      "URL Foto": item.photo_url ?? "Sin evidencia",
      Estado: statusLabels[item.status] ?? item.status,
      "Fecha de Atención": formatPeruvianDateTime(resolvedDate),
      "Respuesta Oficial": latestResponse?.response_text ?? "Sin respuesta oficial aún",
    };
  });
}

/**
 * Compiles and triggers download of filtered suggestions as Excel (.xlsx) entirely client-side.
 * Conforms to Zero Server Cost (Free Tier) principle.
 */
export function exportSuggestionsToExcel(
  suggestions: SuggestionWithResponse[],
  customFilename?: string,
): void {
  const rows = mapSuggestionsToReportRows(suggestions);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set proportional column widths for clean viewing in Microsoft Excel & LibreOffice Calc
  worksheet["!cols"] = [
    { wch: 18 }, // Código Ticket
    { wch: 20 }, // Fecha de Registro
    { wch: 14 }, // Turno
    { wch: 26 }, // Categoría
    { wch: 50 }, // Observación del Estudiante
    { wch: 18 }, // Tiene Evidencia Fotográfica
    { wch: 35 }, // URL Foto
    { wch: 16 }, // Estado
    { wch: 20 }, // Fecha de Atención
    { wch: 50 }, // Respuesta Oficial
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Sugerencias");

  const filename =
    customFilename || `Reporte_Comedor_UNSCH_${getPeruvianDateStamp()}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

/**
 * Compiles and triggers download of filtered suggestions as CSV entirely client-side.
 */
export function exportSuggestionsToCsv(
  suggestions: SuggestionWithResponse[],
  customFilename?: string,
): void {
  const rows = mapSuggestionsToReportRows(suggestions);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  // Add BOM for Excel UTF-8 Spanish accents compatibility
  const blob = new Blob(["\uFEFF" + csvOutput], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename =
    customFilename || `Reporte_Comedor_UNSCH_${getPeruvianDateStamp()}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
