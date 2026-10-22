"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { DealTile } from "@/components/home/deals/deal-tile";
import {
  SHELF_GRID_CLASS,
  SectionCta,
  SectionHeader,
  rise,
} from "@/components/home/shared/section-header";
import { ShopProductCard } from "@/components/shop/product-card";
import { DURATION, EASE_OUT_EXPO, staggerChildren, viewportOnce } from "@/lib/motion";
import type { PublishedDeal, PublishedSection } from "@/types/homepage";

export function DealsSection({ section, deals }: { section: PublishedSection; deals: PublishedDeal[] }) {
  const headingId = `deals-${section.id}`;

  return (
    <section
      aria-labelledby={headingId}
      className="relative overflow-hidden bg-void py-(--spacing-section-sm)"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <SectionHeader
          id={headingId}
          eyebrow={section.eyebrow}
          title={section.title}
          subtitle={section.subtitle}
        />

        {section.description && (
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={rise}
            className="mt-6 max-w-2xl text-base leading-relaxed text-ink-secondary"
          >
            {section.description}
          </motion.p>
        )}

        {section.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewportOnce}
            transition={{ duration: DURATION.cinematic, ease: EASE_OUT_EXPO }}
            className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl border border-line bg-surface sm:aspect-[21/9]"
          >
            <Image
              src={section.imageUrl}
              alt=""
              fill
              sizes="(max-width: 1760px) 100vw, 1760px"
              className="object-cover"
              unoptimized
            />
          </motion.div>
        )}

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.09, 0.1)}
          className={SHELF_GRID_CLASS}
        >
          {deals.map((deal, index) => (
            <motion.li key={deal.id} variants={rise} className="flex">
              {deal.kind === "product" ? (
                <ShopProductCard product={deal.card} priority={index < 2} />
              ) : (
                <DealTile title={deal.title} imageUrl={deal.imageUrl} href={deal.href} />
              )}
            </motion.li>
          ))}
        </motion.ul>

        <SectionCta label={section.ctaLabel} href={section.ctaHref} />
      </div>
    </section>
  );
}
