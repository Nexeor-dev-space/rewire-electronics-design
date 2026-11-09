import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { WaitlistConfirm } from "@/components/waitlist/waitlist-link-actions";
import { NOINDEX_ROBOTS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Confirm your place",
  robots: NOINDEX_ROBOTS,
  referrer: "no-referrer",
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function WaitlistConfirmPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <Container className="page-top pb-(--spacing-section)">
      <WaitlistConfirm token={token} />
    </Container>
  );
}
