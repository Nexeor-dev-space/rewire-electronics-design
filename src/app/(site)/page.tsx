import { Hero } from "@/components/home/hero/hero";
import { UpcomingDrops } from "@/components/home/upcoming-drops/upcoming-drops";
import { Featured } from "@/components/home/featured/featured";
import { WhatYouHave } from "@/components/home/conditions/what-you-have";
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
 * Five sections are preserved but no longer rendered here — see
 * `components/home/categories/`, `components/home/scarcity/`,
 * `components/home/certification/`, `components/home/standard/` and
 * `components/home/process/`. All five were doing legitimate work; each
 * is also now said elsewhere — by the banner (Categories), the hero's
 * own numbers (Scarcity), the About page (Standard, Certification, and
 * now Process), and Standard (Certification). None has been deleted:
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
 *   for pressure's sake. Reinstate below `Stories` if a late-page
 *   deadline turns out to be needed.
 *
 * - **PastDrops** — the "Gone in a drop" archive. Removed from the flow
 *   at the client's request; the sold-out proof now rides on the
 *   calendar cards' own SOLD OUT state. The component and its
 *   `getPastDrops()` adapter remain intact — reinstate between
 *   `WhatYouHave` and `Stories` if the believe-it beat is wanted back.
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
      <WhatYouHave />
      <Stories />
      <Faq />
      <Invitation />
    </>
  );
}
