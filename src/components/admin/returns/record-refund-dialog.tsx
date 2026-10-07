"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useRecordRefund } from "@/hooks/use-return";
import { apiFieldErrors } from "@/lib/api/api-client";
import { ORDER_NOTE_MAX_LENGTH, REFUND_REFERENCE_MAX_LENGTH } from "@/lib/constants";
import { CURRENCY, formatMoney, fromMinorUnits, toMinorUnits } from "@/lib/money";
import type { AdminReturnDetail } from "@/types/return";
import { recordRefundSchema } from "@/validators/return.validator";

export function RecordRefundDialog({ detail, onClose }: { detail: AdminReturnDetail; onClose: () => void }) {
  return (
    <Dialog
      open
      onClose={onClose}
      title="Record refund"
      description={`Record a refund you have already paid for ${detail.number}. The return moves to Refunded.`}
      className="max-w-lg"
    >
      <RecordRefundForm detail={detail} onClose={onClose} />
    </Dialog>
  );
}

function RecordRefundForm({ detail, onClose }: { detail: AdminReturnDetail; onClose: () => void }) {
  const id = useId();
  const refundable = detail.order.refundable;
  const [amount, setAmount] = useState(fromMinorUnits(detail.suggestedRefund));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const refund = useRecordRefund();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountMinor = toMinorUnits(amount);
    const parsed = recordRefundSchema.safeParse({ amount: amountMinor ?? 0, reference, note });
    const localErrors: Record<string, string[] | undefined> = parsed.success
      ? {}
      : z.flattenError(parsed.error).fieldErrors;
    if (amountMinor === null) {
      localErrors.amount = ["Enter an amount like 50.00."];
    }
    if (!parsed.success || amountMinor === null) {
      setErrors(localErrors);
      return;
    }

    setErrors({});
    refund.mutate(
      { number: detail.number, ...parsed.data },
      {
        onSuccess: () => onClose(),
        onError: (error) => setErrors(apiFieldErrors(error)),
      },
    );
  }

  const error = (field: string) => errors[field]?.[0];
  const hasFieldError = Object.values(errors).some((messages) => messages?.length);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <div className="grid gap-5">
          <Field
            id={`${id}-amount`}
            label={`Amount (${CURRENCY})`}
            hint={`Up to ${formatMoney(refundable)}. The suggestion of ${formatMoney(detail.suggestedRefund)} covers the returned items after discount, without delivery.`}
            error={error("amount")}
          >
            <Input
              id={`${id}-amount`}
              data-autofocus
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={error("amount") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-reference`}
            label="Reference"
            hint="The bank, card or cash receipt reference for this refund."
            error={error("reference")}
          >
            <Input
              id={`${id}-reference`}
              value={reference}
              maxLength={REFUND_REFERENCE_MAX_LENGTH}
              onChange={(event) => setReference(event.target.value)}
              aria-invalid={error("reference") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field id={`${id}-note`} label="Note" hint="Visible to the customer." error={error("note")}>
            <Textarea
              id={`${id}-note`}
              value={note}
              maxLength={ORDER_NOTE_MAX_LENGTH}
              onChange={(event) => setNote(event.target.value)}
              aria-invalid={error("note") ? true : undefined}
              className="min-h-24"
            />
          </Field>
        </div>
      </DialogBody>

      <DialogFooter>
        {refund.isError && !hasFieldError && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {refund.error.message}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={refund.isPending}>
          Record refund
        </Button>
      </DialogFooter>
    </form>
  );
}
