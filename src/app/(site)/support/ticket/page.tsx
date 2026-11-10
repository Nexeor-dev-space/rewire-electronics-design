import { SUPPORT_TICKET_PAGE_PATH } from "@/lib/constants";
import { pageMetadata } from "@/lib/seo";
import { TicketForm } from "@/components/support/ticket-form";

export const metadata = pageMetadata({
  title: "Raise a support ticket",
  description: "Tell us what you need help with and a person at Rewire Electronics will reply by email.",
  path: SUPPORT_TICKET_PAGE_PATH,
});

export default function SupportTicketPage() {
  return (
    <section
      aria-labelledby="support-ticket-heading"
      className="relative overflow-hidden bg-void pt-(--spacing-section) pb-(--spacing-section)"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.05),transparent_70%)]"
      />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-(--spacing-gutter)">
        <span className="eyebrow block">Support</span>
        <h1
          id="support-ticket-heading"
          className="mt-8 font-sans text-[clamp(2.25rem,4.6vw,3.75rem)] font-light leading-[1.04] tracking-[-0.03em] text-ink"
        >
          Raise a ticket.
        </h1>
        <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-secondary">
          Tell us what is wrong and we will reply by email. Include your order number if it is about a purchase.
        </p>

        <div className="mt-12">
          <TicketForm />
        </div>
      </div>
    </section>
  );
}
