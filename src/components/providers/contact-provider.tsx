"use client";

import { createContext, useContext, type ReactNode } from "react";
import { NO_CONTACT } from "@/lib/contact";
import type { ContactDetails } from "@/types/contact";

const ContactContext = createContext<ContactDetails>(NO_CONTACT);

/** Hands the saved contact details to client components. The site layout reads them on every request. */
export function ContactProvider({ contact, children }: { contact: ContactDetails; children: ReactNode }) {
  return <ContactContext.Provider value={contact}>{children}</ContactContext.Provider>;
}

export function useContact(): ContactDetails {
  return useContext(ContactContext);
}
