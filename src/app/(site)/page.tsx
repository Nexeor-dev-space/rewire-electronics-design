import { Hero } from "@/components/home/hero/hero";
import { UpcomingDrops } from "@/components/home/upcoming-drops/upcoming-drops";
import { Featured } from "@/components/home/featured/featured";
import { Setup } from "@/components/home/setup/setup";
import { WhatYouHave } from "@/components/home/conditions/what-you-have";
import { PastDrops } from "@/components/home/past-drops/past-drops";
import { Standard } from "@/components/home/standard/standard";
import { Process } from "@/components/home/process/process";
import { Stories } from "@/components/home/stories/stories";
import { Faq } from "@/components/home/faq/faq";
import { Invitation } from "@/components/home/invitation/invitation";

/**
 * The homepage is one argument, told in order. Each section answers the
 * question the previous one raises, and the order is the design:
 *
 *   Hero          see it        — the product, and under it the five
 *                                 families, so the catalogue is offered
 *                                 in the first viewport rather than the
 *                                 second (see `hero/category-strip.tsx`)
 *   UpcomingDrops want it       — three more, each in a visibly different state
 *   Savings       value it      — whichever you pick, up to 42% less than new
 *   PastDrops     believe it    — and these already sold out
 *   Standard      trust it      — inspection, battery, grade, warranty
 *   Process       understand it — and this is what happens when you buy
 *   Stories       trust it      — from people who already did
 *   Faq           last doubts
 *   Invitation    act
 *
 * **The catalogue index is inside the banner**, not a section under it.
 * A reader with no interest in the four current releases is handed a way
 * in before the first scroll, and the second viewport goes to the drop
 * calendar for the reader who is here for a specific drop — previously
 * those two audiences cost a viewport each. **Savings answers both
 * routes at once** — the price argument applies whichever fork was
 * taken, so it sits under the fork rather than after one branch.
 *
 * One consequence worth knowing: the saving now lands *before* the trust
 * case rather than after it, so `Standard` is arguing quality to someone
 * already holding a number. If that reads as cheap-first, the fix is to
 * swap `Savings` and `Standard` back — not to soften either section.
 *
 * Three sections are preserved but no longer rendered here — see
 * `components/home/categories/`, `components/home/scarcity/` and
 * `components/home/certification/`. All three were doing legitimate
 * work; each is also now said elsewhere — by the banner (Categories),
 * the hero's own numbers (Scarcity), and Standard (Certification).
 * None has been deleted:
 *
 * - **Categories** — the five-card catalogue index. Now the banner's
 *   closing strip. Reinstate below `Hero` only if the index outgrows
 *   one row; note that the section carries a "Browse the full
 *   collection" link the strip does not, and that link is otherwise
 *   only in the nav and footer.
 *
 * - **Scarcity** — the closing "current drop will not wait" band. Hero
 *   already prints stock and countdown per device, and every calendar
 *   card carries units left; a section-level restatement was pressure
 *   for pressure's sake. Reinstate below `Stories` (never above `PastDrops`)
 *   if a late-page deadline turns out to be needed.
 * - **Certification** — the five-step programme document. The full
 *   version belongs on the About page (`/about/certification`, already
 *   linked from nav and footer). Wire it there when that route is built.
 *
 * Do not delete any of these components or their data adapters.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <UpcomingDrops />
      <Featured />
      <Setup />
      <WhatYouHave />
      <PastDrops />
      <Standard />
      <Process />
      <Stories />
      <Faq />
      <Invitation />
    </>
  );
}
