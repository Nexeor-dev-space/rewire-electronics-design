"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { rise } from "@/components/home/shared/section-header";
import { headingLines } from "@/lib/homepage-sections";
import { DURATION, EASE_OUT_EXPO, staggerChildren, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PublishedSection } from "@/types/homepage";

/**
 * A promotional or seasonal band, authored through the CMS. Copy left, image
 * right; without an image the copy takes the wider column.
 *
 * The image is decorative (`alt=""`): the banner's meaning is in its heading,
 * and the model has no alt-text field. Add one before banners carry images
 * that say something the copy doesn't.
 */
export function PromoBanner({ section }: { section: PublishedSection }) {
  const headingId = `promo-${section.id}`;

  return (
    <section
      aria-labelledby={headingId}
      className="relative overflow-hidden bg-surface-2 py-(--spacing-section-sm)"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto grid w-full max-w-[110rem] gap-10 px-(--spacing-gutter) lg:grid-cols-12 lg:items-center lg:gap-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
          className={section.imageUrl ? "lg:col-span-5" : "lg:col-span-8"}
        >
          {(section.seasonal || section.eyebrow) && (
            <motion.div variants={rise} className="flex flex-wrap items-center gap-3">
              {section.seasonal && <Badge variant="accent">Seasonal</Badge>}
              {section.eyebrow && (
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-muted">
                  {section.eyebrow}
                </p>
              )}
            </motion.div>
          )}

          <motion.h2
            id={headingId}
            variants={rise}
            className="mt-8 font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.03] tracking-[-0.035em] text-ink"
          >
            {headingLines(section.title).map((line, index) => (
              <span key={index} className="block">
                {line}
              </span>
            ))}
          </motion.h2>

          {section.subtitle && (
            <motion.p variants={rise} className="mt-6 max-w-md text-lg leading-relaxed text-ink">
              {section.subtitle}
            </motion.p>
          )}
          {section.description && (
            <motion.p
              variants={rise}
              className="mt-4 max-w-md text-base leading-relaxed text-ink-secondary"
            >
              {section.description}
            </motion.p>
          )}

          {section.ctaLabel && section.ctaHref && (
            <motion.div variants={rise} className="mt-10">
              <Link
                href={section.ctaHref}
                className={buttonVariants({ variant: "accent", size: "md" })}
              >
                {section.ctaLabel}
              </Link>
            </motion.div>
          )}
        </motion.div>

        {section.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewportOnce}
            transition={{ duration: DURATION.cinematic, ease: EASE_OUT_EXPO }}
            className={cn(
              "relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-surface",
              "lg:col-span-6 lg:col-start-7",
            )}
          >
            {/* `unoptimized`: served by /api/v1/media, as in the console. */}
            <Image
              src={section.imageUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              unoptimized
            />
          </motion.div>
        )}
      </div>
    </section>
  );
}
