import Link from "next/link";
import { siteConfig } from "@/lib/site";

interface Props {
  tagline: string;
}

export function Wordmark({ tagline }: Props) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} — home`}
      className="-my-2 shrink-0 py-2 transition-opacity duration-(--duration-fast) hover:opacity-70"
    >
      <span className="block text-base font-medium leading-none tracking-[0.32em] text-ink">
        REWIRE<span className="text-accent">.</span>
      </span>
      <span className="mt-1 hidden font-mono text-[0.75rem] uppercase leading-none tracking-[0.42em] text-ink-muted sm:block">
        {tagline}
      </span>
    </Link>
  );
}
