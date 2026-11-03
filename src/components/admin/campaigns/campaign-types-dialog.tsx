"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { useModuleAccess } from "@/components/admin/admin-access";
import { RowActions } from "@/components/admin/shared/row-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import {
  useCreateCampaignType,
  useDeleteCampaignType,
  useGetCampaignTypes,
  useUpdateCampaignType,
} from "@/hooks/use-campaign";
import { apiFieldErrors } from "@/lib/api/api-client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CAMPAIGN_TYPE_NAME_MAX_LENGTH } from "@/lib/constants";
import type { AdminCampaignType } from "@/types/campaign";
import { campaignTypeSchema } from "@/validators/campaign.validator";

export function CampaignTypesDialog({ onClose }: { onClose: () => void }) {
  const access = useModuleAccess(PERMISSIONS.campaigns);
  const types = useGetCampaignTypes();
  const deleteType = useDeleteCampaignType();
  const [editing, setEditing] = useState<AdminCampaignType | null>(null);

  return (
    <Dialog open onClose={onClose} title="Campaign types">
      <DialogBody>
        {types.isPending ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : types.isError ? (
          <p role="alert" className="text-sm text-danger">
            {types.error.message}
          </p>
        ) : types.data.items.length === 0 ? (
          <p className="text-sm text-ink-muted">No types yet. Add the first one below.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {types.data.items.map((type) => (
              <li key={type.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{type.name}</p>
                  <p className="text-xs text-ink-muted">
                    {type.campaignCount} {type.campaignCount === 1 ? "campaign" : "campaigns"}
                  </p>
                </div>
                <RowActions
                  name={type.name}
                  disabled={deleteType.isPending}
                  onEdit={access.edit ? () => setEditing(type) : undefined}
                  onDelete={
                    access.delete
                      ? () => deleteType.mutate(type.id, { onSuccess: () => setEditing(null) })
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}

        {deleteType.isError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {deleteType.error.message}
          </p>
        )}

        {(editing ? access.edit : access.create) && (
          <TypeForm
            key={editing?.id ?? "new"}
            type={editing ?? undefined}
            onDone={() => setEditing(null)}
          />
        )}
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function TypeForm({ type, onDone }: { type?: AdminCampaignType; onDone: () => void }) {
  const [name, setName] = useState(type?.name ?? "");
  const [nameError, setNameError] = useState<string | undefined>();
  const createType = useCreateCampaignType();
  const updateType = useUpdateCampaignType();
  const mutation = type ? updateType : createType;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = campaignTypeSchema.safeParse({ name });
    if (!parsed.success) {
      setNameError(z.flattenError(parsed.error).fieldErrors.name?.[0]);
      return;
    }

    setNameError(undefined);
    const callbacks = {
      onSuccess: () => {
        setName("");
        onDone();
      },
      onError: (error: Error) => setNameError(apiFieldErrors(error).name?.[0] ?? error.message),
    };

    if (type) updateType.mutate({ id: type.id, ...parsed.data }, callbacks);
    else createType.mutate(parsed.data, callbacks);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4">
      <div className="flex flex-wrap items-start gap-2">
        <Input
          value={name}
          maxLength={CAMPAIGN_TYPE_NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          placeholder="Type name, like Seasonal Sale"
          aria-label={type ? `New name for ${type.name}` : "New type name"}
          aria-invalid={nameError ? true : undefined}
          className="h-10 min-w-0 flex-1"
        />
        <Button type="submit" size="sm" loading={mutation.isPending}>
          {type ? "Save" : "Add type"}
        </Button>
        {type && (
          <Button type="button" variant="outline" size="sm" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
      <FieldError className="mt-2">{nameError}</FieldError>
    </form>
  );
}
