import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { WaitlistLeave } from "@/components/waitlist/waitlist-link-actions";
import { NOINDEX_ROBOTS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Leave the waitlist",
  robots: NOINDEX_ROBOTS,
  referrer: "no-referrer",
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function WaitlistLeavePage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <Container className="pt-14 pb-(--spacing-section) md:pt-20">
      <WaitlistLeave token={token} />
    </Container>
  );
}
