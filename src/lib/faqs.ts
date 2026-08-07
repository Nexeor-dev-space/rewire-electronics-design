/**
 * FAQ data adapter — the questions the drop model actually raises.
 * Mock for now, Payload CMS later: swap the body of getFaqs() for a CMS
 * query without touching the UI.
 */

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

const faqs: Faq[] = [
  {
    id: "how-drops-work",
    question: "How do product drops work?",
    answer:
      "Each drop is a numbered release of restored devices, published to the calendar days in advance and opened at a fixed time. Waitlist members are notified first, and checkout stays open until the allocation is gone.",
  },
  {
    id: "limited-quantities",
    question: "Why are quantities limited?",
    answer:
      "Because the work is done by hand. Every device passes a 68-point inspection before it is allowed into a release, and we publish only what has cleared it — never a unit more.",
  },
  {
    id: "warranty",
    question: "What's included in the warranty?",
    answer:
      "Twelve months from the day it arrives, covering parts and labour on any hardware fault. Return shipping is on us, and a device we cannot repair is replaced or refunded in full.",
  },
  {
    id: "battery-health",
    question: "How is battery health verified?",
    answer:
      "Each battery is cycled under load and measured against its original capacity. Anything below 98% is replaced with a new cell, and the certified figure is recorded against the device's serial number.",
  },
  {
    id: "returns",
    question: "Can I return a device?",
    answer:
      "Yes — thirty days, for any reason at all. Send it back in the condition it reached you and we refund the full amount, shipping included.",
  },
  {
    id: "launch-notifications",
    question: "When will I receive launch notifications?",
    answer:
      "Waitlist members get one message 48 hours before a drop and one the moment it opens. Nothing else: no newsletters, no partner mail, and your address is never passed on.",
  },
];

export function getFaqs(): Faq[] {
  return faqs;
}
