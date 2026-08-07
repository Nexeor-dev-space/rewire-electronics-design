import { Hero } from "@/components/home/hero/hero";
import { UpcomingDrops } from "@/components/home/upcoming-drops/upcoming-drops";
import { Standard } from "@/components/home/standard/standard";
import { Categories } from "@/components/home/categories/categories";
import { Process } from "@/components/home/process/process";
import { Faq } from "@/components/home/faq/faq";
import { Invitation } from "@/components/home/invitation/invitation";

export default function Home() {
  return (
    <>
      <Hero />
      <UpcomingDrops />
      <Standard />
      <Categories />
      <Process />
      <Faq />
      <Invitation />
    </>
  );
}
