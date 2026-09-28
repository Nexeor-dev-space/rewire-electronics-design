import type { z } from "zod";
import type { HomepageSectionType } from "@/lib/homepage-sections";
import type {
  createHomepageSectionSchema,
  homepageSectionSchema,
} from "@/validators/homepage.validator";

export interface SectionRef {
  id: string;
  name: string;
}

/** A draft section as the admin API returns it. */
export interface HomepageSection {
  id: string;
  type: HomepageSectionType;
  visible: boolean;
  seasonal: boolean;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  /** Submitted back unchanged when the modal leaves the image alone. */
  imageId: string | null;
  /** `/api/v1/media/<id>`, or null. */
  imageUrl: string | null;
  /** Chosen brands or categories that still exist, in display order. */
  refs: SectionRef[];
  /** ISO string. */
  updatedAt: string;
}

export interface HomepageDraft {
  sections: HomepageSection[];
  hasUnpublishedChanges: boolean;
  /** ISO string, or null when the homepage has never been published. */
  publishedAt: string | null;
}

export type HomepageSectionInput = z.input<typeof homepageSectionSchema>;
export type CreateHomepageSectionInput = z.input<typeof createHomepageSectionSchema>;

/** A brand or category inside a live featured section. */
export interface PublishedItem {
  id: string;
  name: string;
  imageUrl: string | null;
  href: string;
}

/** A visible live section, ready for the storefront. */
export interface PublishedSection {
  id: string;
  type: HomepageSectionType;
  seasonal: boolean;
  eyebrow: string | null;
  /** Required by every type, so never null once published. */
  title: string;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  items: PublishedItem[];
}
