import { Hero } from "@/components/home/hero/hero";
import { UpcomingDrops } from "@/components/home/upcoming-drops/upcoming-drops";
import { Categories } from "@/components/home/categories/categories";
import { Featured } from "@/components/home/featured/featured";
import { Setup } from "@/components/home/setup/setup";
import { Savings } from "@/components/home/savings/savings";
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
 *   Hero          see it        — the product, its price, what is left
 *   Categories    find it       — the catalogue index, offered upfront
 *   UpcomingDrops want it       — three more, each in a visibly different state
 *   Savings       value it      — whichever you pick, up to 42% less than new
 *   PastDrops     believe it    — and these already sold out
 *   Standard      trust it      — inspection, battery, grade, warranty
 *   Process       understand it — and this is what happens when you buy
 *   Stories       trust it      — from people who already did
 *   Faq           last doubts
 *   Invitation    act
 *
 * **Categories sits directly under the hero**, so the second viewport
 * opens on the catalogue's index rather than the drop calendar — a
 * reader who has no interest in the four current releases is handed a
 * way in immediately, and the calendar is what follows for the reader
 * who is here for a specific drop. **Savings answers both routes at
 * once** — the price argument applies whichever fork was taken, so it
 * sits under the fork rather than after one branch.
 *
 * One consequence worth knowing: the saving now lands *before* the trust
 * case rather than after it, so `Standard` is arguing quality to someone
 * already holding a number. If that reads as cheap-first, the fix is to
 * swap `Savings` and `Standard` back — not to soften either section.
 *
 * Two sections are preserved but no longer rendered here — see
 * `components/home/scarcity/` and `components/home/certification/`.
 * Both were doing legitimate work; both were also loading urgency the
 * hero (Scarcity) and Standard (Certification) already carry. Neither
 * has been deleted:
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
 * Do not delete either component or its data adapter.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Categories />
      <UpcomingDrops />
      <Featured />
      <Setup />
      <Savings />
      <PastDrops />
      <Standard />
      <Process />
      <Stories />
      <Faq />
      <Invitation />
    </>
  );
}
