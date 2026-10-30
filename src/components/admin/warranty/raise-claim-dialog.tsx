"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { useCreateClaim } from "@/hooks/use-warranty";
import { apiFieldErrors } from "@/lib/api/api-client";
import { WARRANTY_CLAIM_ISSUE_MAX_LENGTH } from "@/lib/constants";
import type { AdminWarrantyDetail } from "@/types/warranty";
import { createClaimSchema } from "@/validators/warranty.validator";
import { claimHref } from "./warranty-management";

export function RaiseClaimDialog({ detail, onClose }: { detail: AdminWarrantyDetail; onClose: () => void }) {
  return (
    <Dialog
      open
      onClose={onClose}
      title="Raise claim"
      description={`A warranty claim for ${detail.productName}, serial ${detail.serialNumber}. It starts at Claim raised; the next step is serial verification.`}
      className="max-w-lg"
    >
      <RaiseClaimForm detail={detail} onClose={onClose} />
    </Dialog>
  );
}

function RaiseClaimForm({ detail, onClose }: { detail: AdminWarrantyDetail; onClose: () => void }) {
  const id = useId();
  const router = useRouter();
  const [issue, setIssue] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const create = useCreateClaim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = createClaimSchema.safeParse({ issue });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    create.mutate(
      { id: detail.id, ...parsed.data },
      {
        onSuccess: (claim) => router.push(claimHref(claim.number)),
        onError: (error) => setErrors(apiFieldErrors(error)),
      },
    );
  }

  const error = (field: string) => errors[field]?.[0];
  const hasFieldError = Object.values(errors).some((messages) => messages?.length);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <Field id={`${id}-issue`} label="Fault" hint="What the customer reported." error={error("issue")}>
          <Textarea
            id={`${id}-issue`}
            data-autofocus
            value={issue}
            maxLength={WARRANTY_CLAIM_ISSUE_MAX_LENGTH}
            onChange={(event) => setIssue(event.target.value)}
            aria-invalid={error("issue") ? true : undefined}
            className="min-h-28"
          />
        </Field>
      </DialogBody>

      <DialogFooter>
        {create.isError && !hasFieldError && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {create.error.message}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={create.isPending}>
          Raise claim
        </Button>
      </DialogFooter>
    </form>
  );
}
