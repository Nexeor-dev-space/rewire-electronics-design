import { formatPhoneDisplay, hoursLines, mailtoHref, telHref, whatsappHref } from "@/lib/contact";
import { supportContact } from "@/lib/support";
import { cn } from "@/lib/utils";
import type { ContactDetails } from "@/types/contact";

const LINK_CLASS = "transition-colors duration-(--duration-fast) hover:text-ink";

/**
 * The saved contact details as links: email, a tap to call phone number,
 * Live Chat (WhatsApp) and the hours. A field staff left empty is not shown,
 * so with nothing saved this renders nothing. Presentational only: server and
 * client components both pass the contact in.
 */
export function ContactLinks({
  contact,
  showHours = true,
  className,
}: {
  contact: ContactDetails;
  showHours?: boolean;
  className?: string;
}) {
  const hours = showHours ? hoursLines(contact.hours) : [];
  if (!contact.email && !contact.phone && !contact.whatsapp && hours.length === 0) return null;

  return (
    <ul className={cn("space-y-2 text-sm text-ink-secondary", className)}>
      {contact.email && (
        <li>
          <a href={mailtoHref(contact.email)} className={LINK_CLASS}>
            {contact.email}
          </a>
        </li>
      )}
      {contact.phone && (
        <li>
          <a href={telHref(contact.phone)} className={LINK_CLASS}>
            {formatPhoneDisplay(contact.phone)}
          </a>
        </li>
      )}
      {contact.whatsapp && (
        <li>
          <a href={whatsappHref(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {supportContact.chatLabel} on WhatsApp
          </a>
        </li>
      )}
      {hours.map((line) => (
        <li key={line} className="text-ink-muted">
          {line}
        </li>
      ))}
    </ul>
  );
}
