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
  {
    id: "certified-meaning",
    question: "What does certified actually mean?",
    answer:
      "That the device passed our 68-point inspection, was graded against a fixed scale, and carries a year of warranty. It is a standard we publish and check against, not a word we apply to whatever we happen to have in stock.",
  },
  {
    id: "how-tested",
    question: "How are devices tested?",
    answer:
      "By hand, one at a time. Display, battery, ports, cameras, audio and connectivity are each checked against the grade before the device is allowed into a release. Anything that fails does not get a second look — it does not ship.",
  },
  {
    id: "device-condition",
    question: "What condition are the devices in?",
    answer:
      "Grade A devices show no meaningful wear at normal viewing distance. Grade B may carry light marks on the casing, never on the screen. Whichever it is, the grade is stated on the product and we would rather undersell it than have it arrive as a surprise.",
  },
  {
    id: "delivery-time",
    question: "How quickly will my order arrive?",
    answer:
      "Within two to four working days across the UAE, tracked from the moment it leaves us. Orders placed while a drop is open ship the next working day.",
  },
  {
    id: "sold-out",
    question: "What happens when a drop sells out?",
    answer:
      "It closes, and the page stays up as a record of what went. There is no queue, no back-order and no waiting list for stock that no longer exists — the next release is the next chance.",
  },
  {
    id: "restock",
    question: "Will a sold-out device come back?",
    answer:
      "Not as that drop. Every release is assembled from the devices that passed inspection that month, so the same model may appear again at a different price and grade, but the drop itself is not repeated. When we say no restock planned, we mean it.",
  },
];

export function getFaqs(): Faq[] {
  return faqs;
}
