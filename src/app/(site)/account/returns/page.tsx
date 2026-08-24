import { Suspense } from "react";
import type { Metadata } from "next";
import { AccountReturns } from "@/components/account/account-returns";
import { AccountGated } from "@/components/account/account-auth-gate";

export const metadata: Metadata = { title: "Returns & refunds" };

export default function ReturnsPage() {
  return (
    <AccountGated>
      {/*
        Suspense is required by useSearchParams in the return-request
        panel — it lets the page pre-render while the query string is
        resolved on the client.
      */}
      <Suspense fallback={null}>
        <AccountReturns />
      </Suspense>
    </AccountGated>
  );
}
