import { Hero } from "@/components/home/hero/hero";
import { UpcomingDrops } from "@/components/home/upcoming-drops/upcoming-drops";
import { Categories } from "@/components/home/categories/categories";
import { Savings } from "@/components/home/savings/savings";
import { Scarcity } from "@/components/home/scarcity/scarcity";
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
 *   UpcomingDrops want it       — three more, each in a visibly different state
 *   Categories    find it       — or start from the kind of device you want
 *   Savings       value it      — whichever you pick, up to 42% less than new
 *   Scarcity      act on it     — 2 left, closing in two days
 *   PastDrops     believe it    — and these already sold out
 *   Standard      trust it      — inspection, battery, grade, warranty
 *   Process       understand it — and this is what happens when you buy
 *   Stories       trust it      — from people who already did
 *   Faq           last doubts
 *   Invitation    act
 *
 * **Categories sits directly after the calendar**, so a reader who does
 * not want any of the four releases on offer is handed a way through the
 * catalogue immediately rather than after five more sections of argument.
 * The browse route and the drop route fork at the same point, and
 * **Savings answers both at once** — the price argument applies whichever
 * fork was taken, so it sits under the fork rather than after one branch.
 *
 * One consequence worth knowing: the saving now lands *before* the trust
 * case rather than after it, so `Standard` is arguing quality to someone
 * already holding a number. If that reads as cheap-first, the fix is to
 * swap `Savings` and `Standard` back — not to soften either section.
 *
 * **Scarcity now follows Savings directly**, so the deadline lands right
 * after the number that makes it worth acting on — "2 left" reads very
 * differently once the reader already knows what staying in the drop is
 * worth. This trades away the older logic of holding urgency until last:
 * it now fires before `PastDrops` has made the case with history, and
 * before `Standard` has made it with the inspection numbers. If urgency
 * this early starts reading as pressure rather than information, move
 * `Scarcity` back below `Stories`, not just below `PastDrops`.
 *
 * The `Certification` section (`components/home/certification/`) is
 * preserved but no longer rendered here: it was too much depth for the
 * homepage's trust beat, and the ground it covers — inspection, grade,
 * warranty — is already carried by `Standard`. The full document belongs
 * on the About page (`/about/certification`, already linked from the nav
 * and footer). Import it there when that route is built; do not delete
 * the component or `lib/certification.ts`.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <UpcomingDrops />
      <Categories />
      <Savings />
      <Scarcity />
      <PastDrops />
      <Standard />
      <Process />
      <Stories />
      <Faq />
      <Invitation />
    </>
  );
}
