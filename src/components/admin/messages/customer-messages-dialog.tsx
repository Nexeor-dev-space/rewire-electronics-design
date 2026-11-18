"use client";

import { useState } from "react";
import { Dialog, DialogBody } from "@/components/ui/dialog";
import { MessageList } from "./message-list";

/** One customer's message history, opened from the Customers list. */
export function CustomerMessagesDialog({
  customer,
  onClose,
}: {
  customer: { id: string; fullName: string } | null;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);

  function close() {
    setPage(1);
    onClose();
  }

  return (
    <Dialog
      open={customer !== null}
      onClose={close}
      title={customer ? `Messages for ${customer.fullName}` : ""}
      description="Every automated email and WhatsApp message sent to this customer, with its outcome."
      className="max-w-5xl"
    >
      <DialogBody>
        {customer && <MessageList filters={{ userId: customer.id, page }} filtered={false} onPageChange={setPage} />}
      </DialogBody>
    </Dialog>
  );
}
