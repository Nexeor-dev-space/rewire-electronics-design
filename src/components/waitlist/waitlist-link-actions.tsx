"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useConfirmWaitlist, useLeaveWaitlist } from "@/hooks/use-waitlist";
import { apiFieldErrors } from "@/lib/api/api-client";
import { RELEASES_PAGE_PATH } from "@/lib/constants";
import { releaseHref } from "@/lib/releases";

const MESSAGE_LINK_INCOMPLETE = "This link is incomplete. Open it again from your email.";

const PRIMARY_LINK =
  "mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-accent text-sm font-medium text-white hover:bg-accent-hover";
const SECONDARY_LINK =
  "mt-6 inline-flex h-11 w-full items-center justify-center rounded-full border border-line-strong text-sm font-medium text-ink hover:border-ink";

interface Props {
  token?: string;
}

export function WaitlistConfirm({ token }: Props) {
  const confirm = useConfirmWaitlist();
  const tokenError = confirm.isError ? apiFieldErrors(confirm.error).token?.[0] : undefined;

  if (!token) return <InvalidLink message={MESSAGE_LINK_INCOMPLETE} />;
  if (tokenError) return <InvalidLink message={tokenError} />;

  if (confirm.isSuccess) {
    const { releaseSlug, releaseTitle } = confirm.data;
    return (
      <Card title="You're on the list">
        <p className="mt-3 text-sm text-ink-secondary">You&apos;re on the list for {releaseTitle}.</p>
        <Link
          href={releaseSlug ? releaseHref(releaseSlug) : RELEASES_PAGE_PATH}
          className={PRIMARY_LINK}
        >
          {releaseSlug ? "View the release" : "See all releases"}
        </Link>
      </Card>
    );
  }

  return (
    <Card title="Confirm your place">
      <p className="mt-3 text-sm text-ink-secondary">
        Click below to confirm your email and keep your place on the waitlist.
      </p>
      <Button
        size="sm"
        loading={confirm.isPending}
        onClick={() => confirm.mutate({ token })}
        className="mt-6 w-full"
      >
        Confirm my place
      </Button>
      {confirm.isError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {confirm.error.message}
        </p>
      )}
    </Card>
  );
}

export function WaitlistLeave({ token }: Props) {
  const leave = useLeaveWaitlist();
  const tokenError = leave.isError ? apiFieldErrors(leave.error).token?.[0] : undefined;

  if (!token) return <InvalidLink message={MESSAGE_LINK_INCOMPLETE} />;
  if (tokenError) return <InvalidLink message={tokenError} />;

  if (leave.isSuccess) {
    return (
      <Card title="You've left the waitlist">
        <p className="mt-3 text-sm text-ink-secondary">You won&apos;t get any more updates about this release.</p>
        <Link href={RELEASES_PAGE_PATH} className={PRIMARY_LINK}>
          See all releases
        </Link>
      </Card>
    );
  }

  return (
    <Card title="Leave the waitlist">
      <p className="mt-3 text-sm text-ink-secondary">
        Click below and we&apos;ll take you off this release&apos;s waitlist.
      </p>
      <Button
        size="sm"
        loading={leave.isPending}
        onClick={() => leave.mutate({ token })}
        className="mt-6 w-full"
      >
        Leave the waitlist
      </Button>
      {leave.isError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {leave.error.message}
        </p>
      )}
    </Card>
  );
}

function InvalidLink({ message }: { message: string }) {
  return (
    <Card title="Link not valid">
      <p className="mt-3 text-sm text-ink-secondary">{message}</p>
      <Link href={RELEASES_PAGE_PATH} className={SECONDARY_LINK}>
        See all releases
      </Link>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-line bg-surface-3 p-6 text-center shadow-(--shadow-soft) sm:p-8">
      <h1 className="text-xl font-medium tracking-tight text-ink">{title}</h1>
      {children}
    </div>
  );
}
