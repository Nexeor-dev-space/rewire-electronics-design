"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useCreateTicketCategory,
  useGetTicketCategories,
  useUpdateTicketCategory,
} from "@/hooks/use-support";
import { apiFieldErrors } from "@/lib/api/api-client";
import { SUPPORT_CATEGORY_NAME_MAX_LENGTH } from "@/lib/constants";
import type { TicketCategoryView } from "@/types/support";

export function CategoriesDialog({ onClose }: { onClose: () => void }) {
  const categories = useGetTicketCategories();

  return (
    <Dialog
      open
      onClose={onClose}
      title="Ticket categories"
      description="Inactive categories can't be chosen for new tickets. Existing tickets keep theirs."
      className="max-w-lg"
    >
      <DialogBody>
        {categories.isPending && <Skeleton className="h-40 w-full" />}
        {categories.isError && (
          <p role="alert" className="text-sm text-danger">
            {categories.error.message}
          </p>
        )}
        {categories.isSuccess && (
          <ul className="divide-y divide-line">
            {categories.data.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </ul>
        )}
        <AddCategoryForm />
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function CategoryRow({ category }: { category: TicketCategoryView }) {
  const update = useUpdateTicketCategory();
  const [name, setName] = useState(category.name);
  const nameError = update.isError ? apiFieldErrors(update.error).name?.[0] : undefined;

  function save(next: { name: string; isActive: boolean }) {
    update.mutate({ id: category.id, ...next });
  }

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <Input
          value={name}
          maxLength={SUPPORT_CATEGORY_NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          aria-label={`Name of ${category.name}`}
          aria-invalid={nameError ? true : undefined}
          className="h-10"
        />
        <Button
          variant="outline"
          size="sm"
          loading={update.isPending}
          disabled={name.trim() === category.name}
          onClick={() => save({ name, isActive: category.isActive })}
        >
          Rename
        </Button>
        <Switch
          checked={category.isActive}
          label={`${category.name} is active`}
          disabled={update.isPending}
          onChange={(isActive) => save({ name: category.name, isActive })}
        />
      </div>
      {nameError && <p className="mt-1.5 text-xs text-danger">{nameError}</p>}
      {update.isError && !nameError && <p className="mt-1.5 text-xs text-danger">{update.error.message}</p>}
    </li>
  );
}

function AddCategoryForm() {
  const create = useCreateTicketCategory();
  const [name, setName] = useState("");
  const nameError = create.isError ? apiFieldErrors(create.error).name?.[0] : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate({ name, isActive: true }, { onSuccess: () => setName("") });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-line pt-4">
      <div className="flex items-center gap-3">
        <Input
          value={name}
          maxLength={SUPPORT_CATEGORY_NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          placeholder="New category"
          aria-label="New category name"
          aria-invalid={nameError ? true : undefined}
          className="h-10"
        />
        <Button type="submit" size="sm" loading={create.isPending} disabled={!name.trim()}>
          Add
        </Button>
      </div>
      {nameError && <p className="mt-1.5 text-xs text-danger">{nameError}</p>}
      {create.isError && !nameError && <p className="mt-1.5 text-xs text-danger">{create.error.message}</p>}
    </form>
  );
}
