/**
 * Certification data adapter — the five things that happen to a device
 * before it is allowed into a drop. Mock for now, Payload CMS later.
 *
 * Written as a *sequence*, not a feature list: each step is something
 * performed on the device in order, which is what separates a
 * certification programme from a page of reassuring adjectives. The UI
 * leans on that order — the numbers are the design.
 */

export interface CertificationStep {
  id: string;
  /** Single word for the compact horizontal rail on wide screens. */
  stage: string;
  title: string;
  description: string;
}

const certificationSteps: CertificationStep[] = [
  {
    id: "inspection",
    stage: "Inspected",
    title: "Multi-point inspection",
    description:
      "Every device is tested across essential hardware and functions before it is considered for a release.",
  },
  {
    id: "condition",
    stage: "Graded",
    title: "Certified condition",
    description:
      "Every device is carefully graded against a fixed scale and clearly described, with nothing left to interpretation.",
  },
  {
    id: "warranty",
    stage: "Warranted",
    title: "Warranty included",
    description:
      "Every purchase carries warranty coverage from the day it arrives, on the same terms as the rest of the drop.",
  },
  {
    id: "quality",
    stage: "Verified",
    title: "Quality checked",
    description:
      "Display, battery, ports, cameras, audio and connectivity are each verified against the grade we publish.",
  },
  {
    id: "ready",
    stage: "Ready",
    title: "Ready for its next life",
    description:
      "Every device is cleaned, prepared and packaged by hand before it leaves us for the person who ordered it.",
  },
];

export function getCertificationSteps(): CertificationStep[] {
  return certificationSteps;
}
