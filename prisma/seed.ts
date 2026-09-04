import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import {
  paragraphsAndBulletsToRichText,
  paragraphsToRichText,
} from "../src/lib/rich-text";
import type { PolicySlug, RichTextDoc } from "../src/lib/policy-types";
import { databaseUrl } from "../src/lib/db-url";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl() }),
});

interface SeedBlock {
  anchor: string;
  title: string;
  content: RichTextDoc;
}

interface SeedPolicy {
  slug: PolicySlug;
  title: string;
  eyebrow: string;
  lede: string;
  draft: boolean;
  blocks: SeedBlock[];
}

const p = paragraphsToRichText;
const pb = paragraphsAndBulletsToRichText;

const terms: SeedPolicy = {
  slug: "terms-and-conditions",
  title: "Terms & Conditions",
  eyebrow: "Legal",
  lede: "The agreement between you and Rewire Electronics when you buy a device from us — what we promise, what we ask, and what happens when something goes wrong.",
  draft: true,
  blocks: [
    {
      anchor: "about-these-terms",
      title: "About these terms",
      content: p([
        "These terms apply to every order placed through this storefront. Placing an order means accepting them as they stand on the day the order is placed; a later change to this page does not alter an order already made.",
        "We trade out of the United Arab Emirates and price in AED. Where a term here conflicts with a right you hold under UAE consumer law, that law wins and the rest of these terms stand unaffected.",
      ]),
    },
    {
      anchor: "what-we-sell",
      title: "What we sell",
      content: p([
        "Every device is described by its condition, and the three conditions mean one thing each. Refurbished is a product that has been restored — repaired, then certified. Pre-Owned is a previously owned product sold in the same condition, tested but not repaired. Open Box is an unused product whose packaging has been opened.",
        "Grade describes wear and is published separately from condition, because a device can be repaired to working order and still carry marks. Grade is stated on any listing where it applies.",
        "Photography is representative of the model, not of the individual unit, unless a listing says otherwise. The condition, grade and battery figure on a listing describe the specific unit you will receive.",
      ]),
    },
    {
      anchor: "orders-and-pricing",
      title: "Orders and pricing",
      content: p([
        "An order is an offer to buy. The contract forms when we confirm despatch, which is also the point at which payment is taken in full.",
        "Prices include VAT where it applies and exclude delivery unless the listing states otherwise. Stock is limited and per unit: a drop allocation or a single listed device can sell out between adding it to a basket and checking out, and we will refund in full rather than substitute a different unit.",
        "If a price or specification is published in error we will contact you before despatch and you may confirm the corrected order or cancel it at no cost.",
      ]),
    },
    {
      anchor: "warranty",
      title: "Warranty",
      content: p([
        "Every device carries a twelve-month Rewire warranty from the day it arrives, covering parts and labour on any hardware fault. Return shipping is paid both ways, and a device we cannot repair is replaced or refunded in full.",
        "The warranty does not cover accidental damage, liquid damage, or a fault caused by repair or modification carried out by anyone other than us.",
        "The full warranty terms are set out on the warranty page and form part of this agreement.",
      ]),
    },
    {
      anchor: "returns",
      title: "Returns, refunds and cancellation",
      content: p([
        "You may return any device within thirty days of delivery, for any reason at all, and no reason is asked for. Send it back in the condition it reached you and we refund the full amount, including the shipping you paid.",
        "An order can be cancelled at no cost at any point before it is despatched. After despatch, the thirty-day return applies instead.",
        "Refunds are issued to the original payment method within fourteen days of the returned device reaching us.",
      ]),
    },
    {
      anchor: "shipping",
      title: "Shipping and delivery",
      content: p([
        "Orders arrive within two to four working days across the UAE, tracked from the moment they leave us. Orders placed while a drop is open ship the next working day.",
        "Risk passes to you on delivery. If a device arrives damaged, tell us within seven days and we will collect it at our cost.",
      ]),
    },
    {
      anchor: "accounts",
      title: "Accounts and waitlists",
      content: p([
        "You are responsible for keeping your account credentials to yourself and for anything done through your account.",
        "Joining a waitlist reserves nothing and guarantees nothing. It is a request to be notified when a drop opens, and it can be withdrawn at any time.",
      ]),
    },
    {
      anchor: "liability",
      title: "Liability",
      content: p([
        "Nothing here limits our liability for death or personal injury caused by negligence, or for fraud.",
        "Beyond that, our liability in connection with an order is limited to the amount paid for it. We are not liable for loss of data; back up any device before returning it, as returned units are wiped to factory state.",
      ]),
    },
    {
      anchor: "contact-terms",
      title: "Getting in touch",
      content: p([
        "Questions about these terms, and anything else, reach a person at the address on the support page.",
      ]),
    },
  ],
};

const privacy: SeedPolicy = {
  slug: "privacy-policy",
  title: "Privacy Policy",
  eyebrow: "Legal",
  lede: "What we collect when you shop with us, why we hold it, how long we keep it, and how to get it back or have it deleted.",
  draft: true,
  blocks: [
    {
      anchor: "what-we-collect",
      title: "What we collect",
      content: p([
        "Account details you give us: your name, email address, and the delivery addresses you save.",
        "Order details: what you bought, what it cost, where it went, and the status of any return or warranty claim.",
        "Waitlist entries: the device you asked to be told about and the address or number you asked us to use.",
        "Technical data your browser sends: pages viewed and a session identifier, used to keep the site working and to understand which parts of it are used.",
      ]),
    },
    {
      anchor: "why-we-hold-it",
      title: "Why we hold it",
      content: p([
        "To fulfil orders, honour warranties and process returns — the things we cannot do without knowing who bought what.",
        "To notify you about a drop you asked to be notified about, and nothing else. We do not sell devices to a mailing list you did not join.",
        "To meet our own legal and tax obligations, which fix how long some order records must be kept regardless of anything else in this policy.",
      ]),
    },
    {
      anchor: "payment",
      title: "Payment details",
      content: p([
        "Card details are handled by our payment processor and never reach our servers. We hold the outcome of a payment — that it succeeded, and for how much — not the instrument that made it.",
      ]),
    },
    {
      anchor: "sharing",
      title: "Who else sees it",
      content: p([
        "Couriers, who need a name and an address to deliver an order. Our payment processor, who needs enough to take a payment and issue a refund.",
        "Nobody else. We do not sell personal data, and we do not share it for anyone else's advertising.",
      ]),
    },
    {
      anchor: "retention",
      title: "How long we keep it",
      content: p([
        "Order records are kept for as long as tax and warranty obligations require, and no longer.",
        "Account details are kept until you ask us to delete the account. Waitlist entries are deleted once the drop they refer to has closed.",
      ]),
    },
    {
      anchor: "your-rights",
      title: "Your rights",
      content: p([
        "You can ask for a copy of what we hold about you, ask us to correct it, or ask us to delete it. Where deletion would conflict with a record we are legally required to keep, we will say so and delete the rest.",
        "You can withdraw consent to drop notifications at any time, from the account area or from any message we send.",
        "Requests reach a person at the address on the support page, and we answer within thirty days.",
      ]),
    },
    {
      anchor: "storage",
      title: "Local storage",
      content: p([
        "Your basket, wishlist and session are held in your own browser's storage so the site works between visits on that device. Clearing your browser data clears them, and they are never read by anyone but you.",
      ]),
    },
  ],
};

const warranty: SeedPolicy = {
  slug: "warranty",
  title: "Warranty",
  eyebrow: "Support",
  lede: "Twelve months on every device from the day it arrives. What the cover includes, what it excludes, and how a claim is handled.",
  draft: true,
  blocks: [
    {
      anchor: "warranty-coverage",
      title: "What is covered",
      content: pb(
        [
          "Twelve months from the day it arrives, covering parts and labour on any hardware fault. Return shipping is on us, and a device we cannot repair is replaced or refunded in full.",
        ],
        [
          "Parts and labour on any hardware fault",
          "Return shipping paid both ways",
          "Replaced or refunded in full if it cannot be repaired",
        ],
      ),
    },
    {
      anchor: "warranty-period",
      title: "The warranty period",
      content: p([
        "Cover runs for twelve months from the day the device is delivered, not from the day it was ordered or the day it was certified.",
        "The warranty stays with the device for the whole of that period. It is not shortened by a repair, and a replacement device carries the remainder of the original term.",
      ]),
    },
    {
      anchor: "warranty-exclusions",
      title: "What is not covered",
      content: p([
        "The warranty does not cover accidental damage, liquid damage, or a fault caused by repair or modification carried out by anyone other than us.",
        "Wear that was disclosed at the point of sale is not a fault. Grade describes wear and is published on every listing where it applies, so a mark that was stated on the listing is not a warranty claim.",
      ]),
    },
    {
      anchor: "warranty-claims",
      title: "Making a claim",
      content: p([
        "Write to us with your order number and what the device is doing. We arrange collection at our cost, diagnose the fault, and repair, replace or refund it.",
        "Back up the device before sending it. Returned units are wiped to factory state, and we are not liable for loss of data.",
      ]),
    },
  ],
};

const shipping: SeedPolicy = {
  slug: "shipping",
  title: "Shipping",
  eyebrow: "Support",
  lede: "How quickly an order arrives, how it is tracked, and what happens if it reaches you damaged.",
  draft: true,
  blocks: [
    {
      anchor: "delivery-times",
      title: "Delivery times",
      content: pb(
        [
          "Within two to four working days across the UAE, tracked from the moment it leaves us. Orders placed while a drop is open ship the next working day.",
        ],
        [
          "Tracked door to door across the UAE",
          "Drop orders ship the next working day",
          "Packed by hand, in the condition it was certified",
        ],
      ),
    },
    {
      anchor: "tracking",
      title: "Tracking an order",
      content: p([
        "Tracking goes live the moment a device leaves us, and the link is in your account under Orders as well as in the despatch email.",
        "Payment is taken when we confirm despatch, so a tracking number and a charge appear together rather than days apart.",
      ]),
    },
    {
      anchor: "shipping-costs",
      title: "Costs and VAT",
      content: p([
        "Prices include VAT where it applies and exclude delivery unless the listing states otherwise. The delivery charge, if there is one, is shown in full at checkout before payment.",
      ]),
    },
    {
      anchor: "damage-in-transit",
      title: "Risk and damage in transit",
      content: p([
        "Risk passes to you on delivery. If a device arrives damaged, tell us within seven days and we will collect it at our cost.",
      ]),
    },
  ],
};

const returns: SeedPolicy = {
  slug: "returns-refunds-cancellation",
  title: "Returns, Refunds & Cancellation",
  eyebrow: "Support",
  lede: "Thirty days to change your mind, no reason asked for. How to return a device, cancel an order, and when the money reaches you.",
  draft: true,
  blocks: [
    {
      anchor: "returns-window",
      title: "Returning a device",
      content: pb(
        [
          "Thirty days, for any reason at all. Send it back in the condition it reached you and we refund the full amount, shipping included.",
        ],
        [
          "No reason required, and none asked for",
          "Full refund including the shipping you paid",
          "Return it in the condition it reached you",
        ],
      ),
    },
    {
      anchor: "cancellation",
      title: "Cancelling an order",
      content: p([
        "An order can be cancelled at no cost at any point before it is despatched. After despatch, the thirty-day return applies instead.",
        "Payment is only taken when we confirm despatch, so a cancellation before that point leaves nothing to refund.",
      ]),
    },
    {
      anchor: "refunds",
      title: "Refunds",
      content: p([
        "Refunds are issued to the original payment method within fourteen days of the returned device reaching us.",
        "Where a device sells out between your adding it to a basket and checking out, we refund in full rather than substitute a different unit.",
      ]),
    },
    {
      anchor: "return-condition",
      title: "Condition on return",
      content: p([
        "Send the device back in the condition it reached you, with the accessories it arrived with.",
        "Back it up first. Returned units are wiped to factory state, and we are not liable for loss of data.",
      ]),
    },
  ],
};

const faqEntries: [anchor: string, question: string, answer: string][] = [
  [
    "how-drops-work",
    "How do product drops work?",
    "Each drop is a numbered release of restored devices, published to the calendar days in advance and opened at a fixed time. Waitlist members are notified first, and checkout stays open until the allocation is gone.",
  ],
  [
    "limited-quantities",
    "Why are quantities limited?",
    "Because the work is done by hand. Every device passes a 68-point inspection before it is allowed into a release, and we publish only what has cleared it — never a unit more.",
  ],
  [
    "warranty",
    "What's included in the warranty?",
    "Twelve months from the day it arrives, covering parts and labour on any hardware fault. Return shipping is on us, and a device we cannot repair is replaced or refunded in full.",
  ],
  [
    "battery-health",
    "How is battery health verified?",
    "Each battery is cycled under load and measured against its original capacity. Anything below 98% is replaced with a new cell, and the certified figure is recorded against the device's serial number.",
  ],
  [
    "returns",
    "Can I return a device?",
    "Yes — thirty days, for any reason at all. Send it back in the condition it reached you and we refund the full amount, shipping included.",
  ],
  [
    "launch-notifications",
    "When will I receive launch notifications?",
    "Waitlist members get one message 48 hours before a drop and one the moment it opens. Nothing else: no newsletters, no partner mail, and your address is never passed on.",
  ],
  [
    "certified-meaning",
    "What does certified actually mean?",
    "That the device passed our 68-point inspection, was graded against a fixed scale, and carries a year of warranty. It is a standard we publish and check against, not a word we apply to whatever we happen to have in stock.",
  ],
  [
    "how-tested",
    "How are devices tested?",
    "By hand, one at a time. Display, battery, ports, cameras, audio and connectivity are each checked against the grade before the device is allowed into a release. Anything that fails does not get a second look — it does not ship.",
  ],
  [
    "device-condition",
    "What condition are the devices in?",
    "Grade A devices show no meaningful wear at normal viewing distance. Grade B may carry light marks on the casing, never on the screen. Whichever it is, the grade is stated on the product and we would rather undersell it than have it arrive as a surprise.",
  ],
  [
    "delivery-time",
    "How quickly will my order arrive?",
    "Within two to four working days across the UAE, tracked from the moment it leaves us. Orders placed while a drop is open ship the next working day.",
  ],
  [
    "sold-out",
    "What happens when a drop sells out?",
    "It closes, and the page stays up as a record of what went. There is no queue, no back-order and no waiting list for stock that no longer exists — the next release is the next chance.",
  ],
  [
    "restock",
    "Will a sold-out device come back?",
    "Not as that drop. Every release is assembled from the devices that passed inspection that month, so the same model may appear again at a different price and grade, but the drop itself is not repeated. When we say no restock planned, we mean it.",
  ],
];

const faq: SeedPolicy = {
  slug: "faq",
  title: "Frequently Asked Questions",
  eyebrow: "Support",
  lede: "Everything worth knowing before a drop opens — how the releases run, what we guarantee, and what happens after the box arrives.",
  draft: false,
  blocks: faqEntries.map(([anchor, question, answer]) => ({
    anchor,
    title: question,
    content: p([answer]),
  })),
};

const policies: SeedPolicy[] = [
  warranty,
  terms,
  shipping,
  faq,
  privacy,
  returns,
];

async function seedPolicies() {
  for (const policy of policies) {
    const { blocks, ...fields } = policy;

    await prisma.$transaction(async (tx) => {
      const row = await tx.policy.upsert({
        where: { slug: policy.slug },
        create: { ...fields, published: true },
        update: { ...fields, published: true },
      });

      await tx.policyBlock.deleteMany({ where: { policyId: row.id } });

      await tx.policyBlock.createMany({
        data: blocks.map((block, index) => ({
          policyId: row.id,
          anchor: block.anchor,
          title: block.title,
          content: block.content as unknown as Prisma.InputJsonValue,
          sortOrder: index,
        })),
      });
    });

    console.log(`  ${policy.slug} — ${blocks.length} blocks`);
  }
}

async function main() {
  console.log("Policies:");
  await seedPolicies();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
