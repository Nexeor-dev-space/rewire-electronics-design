/**
 * Legal document adapter — mock for now, Payload CMS later. Swap the
 * body of `getLegalDocument()` for a CMS query without touching the UI,
 * exactly as `support.ts` does.
 *
 * ⚠ **DRAFT COPY, NOT REVIEWED LEGAL TEXT.** Every clause below is
 * plain-language scaffolding written to match what the storefront
 * already commits to elsewhere — twelve months of warranty, thirty days
 * to return, two to four working days to arrive, trading in AED out of
 * the UAE. It is honest about the product, but it has not been through
 * a lawyer, and `draft: true` puts that on the page rather than hiding
 * it. Replace the section bodies with reviewed text and flip the flag.
 *
 * Two documents, one shape. `/terms` and `/privacy` are the same page
 * rendered from different data, because they are the same *kind* of
 * page: a title, a date, and a list of headed sections a reader scans
 * rather than reads.
 *
 * These routes exist because the navigation names them. The About menu
 * lists Terms & Conditions and Privacy Policy, and the footer has
 * linked to `/terms` and `/privacy` since it was written — both of
 * which 404'd, because neither page had been built. The house rule is
 * that a nav item never points at a route that is not there (see
 * `route-map.ts`), so the pages were built rather than the links
 * quietly re-pointed at `/support`.
 */

export interface LegalSection {
  /** Doubles as the in-page anchor: `/terms#returns`. */
  id: string;
  heading: string;
  /** One paragraph per entry. Never a wall. */
  body: string[];
}

export interface LegalDocument {
  slug: "terms" | "privacy";
  /** Page title and `<h1>`. */
  title: string;
  /** The eyebrow above it. */
  eyebrow: string;
  /** One paragraph, set against the title. */
  lede: string;
  /** ISO date the text last changed. Rendered in the reader's locale. */
  updatedAt: string;
  /** True while the copy is scaffolding rather than reviewed text. */
  draft: boolean;
  sections: LegalSection[];
}

const documents: Record<LegalDocument["slug"], LegalDocument> = {
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    eyebrow: "Legal",
    lede: "The agreement between you and Rewire Electronics when you buy a device from us — what we promise, what we ask, and what happens when something goes wrong.",
    updatedAt: "2026-09-02",
    draft: true,
    sections: [
      {
        id: "about-these-terms",
        heading: "About these terms",
        body: [
          "These terms apply to every order placed through this storefront. Placing an order means accepting them as they stand on the day the order is placed; a later change to this page does not alter an order already made.",
          "We trade out of the United Arab Emirates and price in AED. Where a term here conflicts with a right you hold under UAE consumer law, that law wins and the rest of these terms stand unaffected.",
        ],
      },
      {
        id: "what-we-sell",
        heading: "What we sell",
        body: [
          "Every device is described by its condition, and the three conditions mean one thing each. Refurbished is a product that has been restored — repaired, then certified. Pre-Owned is a previously owned product sold in the same condition, tested but not repaired. Open Box is an unused product whose packaging has been opened.",
          "Grade describes wear and is published separately from condition, because a device can be repaired to working order and still carry marks. Grade is stated on any listing where it applies.",
          "Photography is representative of the model, not of the individual unit, unless a listing says otherwise. The condition, grade and battery figure on a listing describe the specific unit you will receive.",
        ],
      },
      {
        id: "orders-and-pricing",
        heading: "Orders and pricing",
        body: [
          "An order is an offer to buy. The contract forms when we confirm despatch, which is also the point at which payment is taken in full.",
          "Prices include VAT where it applies and exclude delivery unless the listing states otherwise. Stock is limited and per unit: a drop allocation or a single listed device can sell out between adding it to a basket and checking out, and we will refund in full rather than substitute a different unit.",
          "If a price or specification is published in error we will contact you before despatch and you may confirm the corrected order or cancel it at no cost.",
        ],
      },
      {
        id: "warranty",
        heading: "Warranty",
        body: [
          "Every device carries a twelve-month Rewire warranty from the day it arrives, covering parts and labour on any hardware fault. Return shipping is paid both ways, and a device we cannot repair is replaced or refunded in full.",
          "The warranty does not cover accidental damage, liquid damage, or a fault caused by repair or modification carried out by anyone other than us.",
          "The full warranty terms are set out on the support page and form part of this agreement.",
        ],
      },
      {
        id: "returns",
        heading: "Returns, refunds and cancellation",
        body: [
          "You may return any device within thirty days of delivery, for any reason at all, and no reason is asked for. Send it back in the condition it reached you and we refund the full amount, including the shipping you paid.",
          "An order can be cancelled at no cost at any point before it is despatched. After despatch, the thirty-day return applies instead.",
          "Refunds are issued to the original payment method within fourteen days of the returned device reaching us.",
        ],
      },
      {
        id: "shipping",
        heading: "Shipping and delivery",
        body: [
          "Orders arrive within two to four working days across the UAE, tracked from the moment they leave us. Orders placed while a drop is open ship the next working day.",
          "Risk passes to you on delivery. If a device arrives damaged, tell us within seven days and we will collect it at our cost.",
        ],
      },
      {
        id: "accounts",
        heading: "Accounts and waitlists",
        body: [
          "You are responsible for keeping your account credentials to yourself and for anything done through your account.",
          "Joining a waitlist reserves nothing and guarantees nothing. It is a request to be notified when a drop opens, and it can be withdrawn at any time.",
        ],
      },
      {
        id: "liability",
        heading: "Liability",
        body: [
          "Nothing here limits our liability for death or personal injury caused by negligence, or for fraud.",
          "Beyond that, our liability in connection with an order is limited to the amount paid for it. We are not liable for loss of data; back up any device before returning it, as returned units are wiped to factory state.",
        ],
      },
      {
        id: "contact-terms",
        heading: "Getting in touch",
        body: [
          "Questions about these terms, and anything else, reach a person at the address on the support page.",
        ],
      },
    ],
  },

  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    eyebrow: "Legal",
    lede: "What we collect when you shop with us, why we hold it, how long we keep it, and how to get it back or have it deleted.",
    updatedAt: "2026-09-02",
    draft: true,
    sections: [
      {
        id: "what-we-collect",
        heading: "What we collect",
        body: [
          "Account details you give us: your name, email address, and the delivery addresses you save.",
          "Order details: what you bought, what it cost, where it went, and the status of any return or warranty claim.",
          "Waitlist entries: the device you asked to be told about and the address or number you asked us to use.",
          "Technical data your browser sends: pages viewed and a session identifier, used to keep the site working and to understand which parts of it are used.",
        ],
      },
      {
        id: "why-we-hold-it",
        heading: "Why we hold it",
        body: [
          "To fulfil orders, honour warranties and process returns — the things we cannot do without knowing who bought what.",
          "To notify you about a drop you asked to be notified about, and nothing else. We do not sell devices to a mailing list you did not join.",
          "To meet our own legal and tax obligations, which fix how long some order records must be kept regardless of anything else in this policy.",
        ],
      },
      {
        id: "payment",
        heading: "Payment details",
        body: [
          "Card details are handled by our payment processor and never reach our servers. We hold the outcome of a payment — that it succeeded, and for how much — not the instrument that made it.",
        ],
      },
      {
        id: "sharing",
        heading: "Who else sees it",
        body: [
          "Couriers, who need a name and an address to deliver an order. Our payment processor, who needs enough to take a payment and issue a refund.",
          "Nobody else. We do not sell personal data, and we do not share it for anyone else's advertising.",
        ],
      },
      {
        id: "retention",
        heading: "How long we keep it",
        body: [
          "Order records are kept for as long as tax and warranty obligations require, and no longer.",
          "Account details are kept until you ask us to delete the account. Waitlist entries are deleted once the drop they refer to has closed.",
        ],
      },
      {
        id: "your-rights",
        heading: "Your rights",
        body: [
          "You can ask for a copy of what we hold about you, ask us to correct it, or ask us to delete it. Where deletion would conflict with a record we are legally required to keep, we will say so and delete the rest.",
          "You can withdraw consent to drop notifications at any time, from the account area or from any message we send.",
          "Requests reach a person at the address on the support page, and we answer within thirty days.",
        ],
      },
      {
        id: "storage",
        heading: "Local storage",
        body: [
          "Your basket, wishlist and session are held in your own browser's storage so the site works between visits on that device. Clearing your browser data clears them, and they are never read by anyone but you.",
        ],
      },
    ],
  },
};

export function getLegalDocument(slug: LegalDocument["slug"]): LegalDocument {
  return documents[slug];
}
