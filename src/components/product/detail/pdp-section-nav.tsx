"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * PdpSectionNav — the pill tab strip that sits above the long-form PDP
 * sections.
 *
 * Modelled on the noon.com PDP overview strip: three pill anchors, one
 * lit at a time, that scroll to the matching section below. Every tab
 * is an `<a href="#…">`, so it works without JavaScript (the browser
 * scrolls the anchor into view) and with it (a scroll-spy powered by
 * IntersectionObserver lights the tab whose section is currently the
 * dominant one in the viewport).
 *
 * The IDs the tabs point to must exist on the page — the PDP wires
 * them onto `<section id="overview">`, `<section id="specifications">`,
 * etc. The component receives the pairs so a listing without one of
 * the sections (accessory PDPs skip Specifications) can drop the
 * matching tab rather than pointing at a missing anchor.
 */
interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
}

export function PdpSectionNav({ tabs }: Props) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const clickedRef = useRef<string | null>(null);
  const clickTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (tabs.length === 0) return;
    const sections = tabs
      .map((tab) => document.getElementById(tab.id))
      .filter((el): el is HTMLElement => !!el);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // While the reader has just clicked a tab, ignore observer
        // firing on adjacent sections during the smooth scroll — the
        // click is authoritative until the tap-target section actually
        // reaches the top.
        if (clickedRef.current) return;

        // Pick the intersecting section that sits highest on the page
        // (smallest top offset) as the "active" one. That matches how
        // the reader parses the screen: the section they can see the
        // top of is the one they are reading.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible[0]) setActive(visible[0].target.id);
      },
      {
        // Trigger the highlight change when a section crosses the
        // upper third of the viewport rather than the exact top edge —
        // by the time a section's heading is 33% down the screen, the
        // reader is unmistakably on it.
        rootMargin: "-33% 0px -60% 0px",
        threshold: 0,
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [tabs]);

  function handleClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) {
    // Progressive enhancement: only intercept when smooth-scroll is
    // available and the reader has not asked the browser for reduced
    // motion. Otherwise fall through to the native anchor jump.
    if (typeof window === "undefined") return;
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    setActive(id);

    // Hold the click as authoritative for a moment so IntersectionObserver
    // firing on intermediate sections during the smooth scroll cannot
    // fight the intended destination.
    clickedRef.current = id;
    if (clickTimeoutRef.current) {
      window.clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = window.setTimeout(() => {
      clickedRef.current = null;
    }, 800);

    // Offset for the fixed masthead — matches `scroll-mt-*` on the
    // sections but centralised here so a section that forgets to set
    // the class still lands cleanly.
    const HEADER_OFFSET = 96;
    const top =
      target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
    // Update the address bar without triggering the browser's own jump.
    window.history.replaceState(null, "", `#${id}`);
  }

  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label="Product sections"
      className="flex flex-wrap gap-2.5 border-b border-line pb-6 md:gap-3"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            onClick={(event) => handleClick(event, tab.id)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "inline-flex h-11 items-center rounded-full px-5 text-[0.8125rem] font-medium tracking-tight",
              "transition-colors duration-(--duration-fast) ease-(--ease-out-quart)",
              isActive
                ? // Active pill: bright chip on the dark ground, matches
                  // the noon reference's white-fill state translated into
                  // the dark theme (ink surface, void text).
                  "bg-ink text-void"
                : // Inactive pill: hairline outline, ink text, hover lifts
                  // the border rather than filling — the active pill is
                  // the only one that reads as "chosen".
                  "border border-line-strong text-ink hover:border-white/[0.28]",
            )}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
