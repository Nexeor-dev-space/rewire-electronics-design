"use client";

import { useState } from "react";
import { WaitlistModal, type WaitlistRelease } from "@/components/home/hero/waitlist-modal";
import { Button } from "@/components/ui/button";

export function NotifyMeButton({ release, className }: { release: WaitlistRelease; className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="accent"
        size="lg"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={className}
      >
        Notify me
      </Button>
      <WaitlistModal release={open ? release : null} onClose={() => setOpen(false)} />
    </>
  );
}
