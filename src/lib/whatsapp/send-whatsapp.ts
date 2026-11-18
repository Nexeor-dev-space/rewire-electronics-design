import "server-only";

import { WHATSAPP_API_BASE, WHATSAPP_REQUEST_TIMEOUT_MS, WHATSAPP_TEMPLATE_LANGUAGE } from "@/lib/constants";
import type { WhatsAppMessage } from "./templates";

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
}

export type WhatsAppResult = "SENT" | "NOT_CONFIGURED";

/**
 * The WhatsApp Business (Cloud API) credentials. They are secrets, so by
 * project rule they would be env values, and a new env var needs approval
 * first. Until that is given this returns null and every WhatsApp message is
 * recorded as skipped ("WhatsApp isn't set up"). See docs/MESSAGING.md §7.
 */
export function getWhatsAppConfig(): WhatsAppConfig | null {
  return null;
}

/** Sends one approved template. Throws with the provider's reason when it is refused. */
export async function sendWhatsApp(to: string, message: WhatsAppMessage): Promise<WhatsAppResult> {
  const config = getWhatsAppConfig();
  if (!config) return "NOT_CONFIGURED";

  const response = await fetch(`${WHATSAPP_API_BASE}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(WHATSAPP_REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "template",
      template: {
        name: message.template,
        language: { code: WHATSAPP_TEMPLATE_LANGUAGE },
        components: [{ type: "body", parameters: message.params.map((text) => ({ type: "text", text })) }],
      },
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`WhatsApp refused the message (${response.status}) ${detail}`.trim());
  }
  return "SENT";
}
