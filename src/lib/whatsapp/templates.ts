import { WHATSAPP_TEMPLATES } from "@/lib/constants";
import type { ReleaseMessageTrigger } from "@/lib/messaging";

/**
 * WhatsApp only sends templates approved in the WhatsApp Business account, so
 * a message is a template name plus its filled in variables, never free text.
 * Template names live in `WHATSAPP_TEMPLATES`; each template body takes the
 * variables below in this order. See docs/MESSAGING.md.
 */
export interface WhatsAppMessage {
  template: string;
  /** Body variables {{1}}, {{2}}, ... in order. */
  params: string[];
}

export interface ReleaseMessageData {
  title: string;
  /** The opening time, already formatted for the customer. */
  opensAt: string;
  /** How far off the opening is, for example "2 days". */
  timeLeft: string;
  url: string;
}

/** Countdown and reminder: {{1}} title, {{2}} time left, {{3}} opening time, {{4}} link. */
export function releaseCountdownWhatsApp(trigger: ReleaseMessageTrigger, data: ReleaseMessageData): WhatsAppMessage {
  return {
    template: WHATSAPP_TEMPLATES[trigger],
    params: [data.title, data.timeLeft, data.opensAt, data.url],
  };
}

/** Drop live: {{1}} title, {{2}} link. */
export function dropLiveWhatsApp(data: Pick<ReleaseMessageData, "title" | "url">): WhatsAppMessage {
  return { template: WHATSAPP_TEMPLATES.DROP_LIVE, params: [data.title, data.url] };
}
