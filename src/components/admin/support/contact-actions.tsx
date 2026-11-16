"use client";

import { useState } from "react";
import { formatPhoneDisplay, mailtoHref, telHref, whatsappHref } from "@/lib/contact";

const LINK_CLASS = "underline-offset-4 hover:underline";
const OPTION_CLASS =
  "rounded-lg border border-line px-3 py-1.5 text-xs text-ink transition-colors duration-(--duration-fast) hover:bg-surface-2";

/** Opens the staff member's mail app with the ticket subject filled in. */
export function EmailLink({ email, subject }: { email: string; subject: string }) {
  return (
    <a href={`${mailtoHref(email)}?subject=${encodeURIComponent(subject)}`} className={`break-all ${LINK_CLASS}`}>
      {email}
    </a>
  );
}

/** The number, and on click two ways to reach the customer: WhatsApp or a call. */
export function PhoneActions({ phone, greeting }: { phone: string; greeting: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={LINK_CLASS}>
        {formatPhoneDisplay(phone)}
      </button>
      {open && (
        <div className="flex flex-wrap justify-end gap-2">
          <a href={whatsappHref(phone, greeting)} target="_blank" rel="noopener noreferrer" className={OPTION_CLASS}>
            Message on WhatsApp
          </a>
          <a href={telHref(phone)} className={OPTION_CLASS}>
            Call this number
          </a>
        </div>
      )}
    </div>
  );
}
