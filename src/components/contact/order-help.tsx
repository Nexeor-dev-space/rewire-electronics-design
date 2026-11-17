"use client";

import { ContactLinks } from "@/components/contact/contact-links";
import { useContact } from "@/components/providers/contact-provider";
import { hasContact } from "@/lib/contact";

/** "Questions about this order?" with the saved contact details; hidden until staff fill them. */
export function OrderHelp() {
  const contact = useContact();
  if (!hasContact(contact)) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 md:p-7">
      <h2 className="text-[1.125rem] font-medium text-ink">Questions about this order?</h2>
      <ContactLinks contact={contact} className="mt-4" />
    </section>
  );
}
