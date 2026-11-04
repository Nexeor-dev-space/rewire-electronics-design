"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { WaitlistModal, type WaitlistRelease } from "@/components/home/hero/waitlist-modal";
import { DropCard } from "@/components/home/upcoming-drops/drop-card";
import { fadeUp, staggerChildren } from "@/lib/motion";
import type { PublishedDrop } from "@/types/homepage";

export function ReleaseGrid({ drops }: { drops: PublishedDrop[] }) {
  const [waitlistRelease, setWaitlistRelease] = useState<WaitlistRelease | null>(null);

  return (
    <>
      <motion.ul
        initial="hidden"
        animate="visible"
        variants={staggerChildren()}
        className="grid grid-cols-1 gap-x-4 gap-y-10 min-[360px]:grid-cols-2 sm:gap-x-6 sm:gap-y-14 lg:grid-cols-3 xl:grid-cols-4"
      >
        {drops.map((drop, index) => (
          <motion.li key={drop.id} variants={fadeUp} className="flex h-full w-full">
            <DropCard
              drop={drop}
              priority={index === 0}
              onJoinWaitlist={() => setWaitlistRelease({ slug: drop.releaseSlug, title: drop.name })}
            />
          </motion.li>
        ))}
      </motion.ul>

      <WaitlistModal release={waitlistRelease} onClose={() => setWaitlistRelease(null)} />
    </>
  );
}
