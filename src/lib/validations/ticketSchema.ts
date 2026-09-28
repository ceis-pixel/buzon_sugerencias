import { z } from "zod";

import { TICKET_CODE_REGEX } from "@/lib/utils/ticket";

/**
 * Zod schema for the public ticket lookup form.
 * Validates that the entered code conforms to the UNSCH-XXXX format before any RPC call.
 */
export const ticketLookupSchema = z.object({
  code: z
    .string({ error: "Ingresa el código de seguimiento de tu sugerencia." })
    .trim()
    .min(1, "El código de seguimiento no puede estar vacío.")
    .regex(
      TICKET_CODE_REGEX,
      "El formato del código no es válido. Debe ser UNSCH-XXXX (cuatro caracteres alfanuméricos).",
    ),
});

export type TicketLookupInput = z.infer<typeof ticketLookupSchema>;
