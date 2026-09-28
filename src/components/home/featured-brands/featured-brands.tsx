"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { SectionCta, SectionHeader, rise } from "@/components/home/shared/section-header";
import { staggerChildren, viewportOnce } from "@/lib/motion";
import type { PublishedSection } from "@/types/homepage";

/** A row of brand plates, each opening the shop filtered to that brand. */
export function FeaturedBrands({ section }: { section: PublishedSection }) {
  const headingId = `brands-${section.id}`;

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

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.06, 0.1)}
          className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:mt-16 lg:grid-cols-6 lg:gap-4"
        >
          {section.items.map((brand) => (
            <motion.li key={brand.id} variants={rise} className="flex">
              <Link
                href={brand.href}
                className="flex w-full flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-surface p-6 shadow-(--shadow-edge) transition-[background-color,border-color] duration-(--duration-fast) ease-(--ease-out-quart) hover:border-line-strong hover:bg-surface-3"
              >
                {brand.imageUrl && (
                  <span className="relative block h-12 w-full">
                    <Image
                      src={brand.imageUrl}
                      alt=""
                      fill
                      sizes="10rem"
                      className="object-contain"
                      unoptimized
                    />
                  </span>
                )}
                <span className="text-sm font-medium text-ink">{brand.name}</span>
              </Link>
            </motion.li>
          ))}
        </motion.ul>

        <SectionCta label={section.ctaLabel} href={section.ctaHref} />
      </div>
    </section>
  );
}
