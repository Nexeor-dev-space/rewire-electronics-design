"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { SectionCta, SectionHeader, rise } from "@/components/home/shared/section-header";
import { staggerChildren, viewportOnce } from "@/lib/motion";
import type { PublishedSection } from "@/types/homepage";

/** Category plates: the category's photograph with its name beneath. */
export function FeaturedCategories({ section }: { section: PublishedSection }) {
  const headingId = `categories-${section.id}`;

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
          variants={staggerChildren(0.08, 0.1)}
          className="mt-14 grid grid-cols-1 gap-x-4 gap-y-10 min-[360px]:grid-cols-2 sm:gap-x-6 lg:mt-16 xl:grid-cols-4"
        >
          {section.items.map((category) => (
            <motion.li key={category.id} variants={rise} className="flex">
              <Link href={category.href} className="group flex w-full flex-col gap-4">
                <span className="relative block aspect-square overflow-hidden rounded-2xl border border-line bg-surface shadow-(--shadow-edge)">
                  {category.imageUrl && (
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 1280px) 50vw, 25vw"
                      className="object-cover transition-transform duration-(--duration-slow) ease-(--ease-out-quart) group-hover:scale-[1.03]"
                      unoptimized
                    />
                  )}
                </span>
                <span className="text-base font-medium text-ink">{category.name}</span>
              </Link>
            </motion.li>
          ))}
        </motion.ul>

        <SectionCta label={section.ctaLabel} href={section.ctaHref} />
      </div>
    </section>
  );
}
