"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { useCreateAddOn, useUpdateAddOn } from "@/hooks/use-add-on";
import { useGetCategories } from "@/hooks/use-category";
import { apiFieldErrors } from "@/lib/api/api-client";
import { ADD_ON_KIND_LABELS } from "@/lib/catalogue";
import { PICKER_PAGE_SIZE } from "@/lib/constants";
import { CURRENCY, fromMinorUnits, toMinorUnits } from "@/lib/money";
import type { AddOnItem } from "@/types/add-on";
import { ADD_ON_KINDS, addOnSchema, type AddOnKind } from "@/validators/add-on.validator";

const PICKER_FILTERS = { pageSize: PICKER_PAGE_SIZE } as const;

export function AddOnFormModal({ addOn, onClose }: { addOn?: AddOnItem; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} title={addOn ? "Edit add-on" : "Add add-on"}>
      <AddOnForm initial={addOn} onClose={onClose} />
    </Dialog>
  );
}

function AddOnForm({ initial, onClose }: { initial?: AddOnItem; onClose: () => void }) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [kind, setKind] = useState<AddOnKind>(initial?.kind ?? "ACCESSORY");
  const [price, setPrice] = useState(initial ? fromMinorUnits(initial.price) : "");
  const [popular, setPopular] = useState(initial?.popular ?? false);
  const [active, setActive] = useState(initial?.active ?? true);
  const [appliesToAll, setAppliesToAll] = useState(initial?.appliesToAll ?? false);
  const [categoryIds, setCategoryIds] = useState<string[]>(
    initial?.categories.map((category) => category.id) ?? [],
  );
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const categories = useGetCategories(PICKER_FILTERS);
  const createAddOn = useCreateAddOn();
  const updateAddOn = useUpdateAddOn();
  const mutation = initial ? updateAddOn : createAddOn;

  function toggleCategory(categoryId: string, checked: boolean) {
    setCategoryIds((current) =>
      checked ? [...current, categoryId] : current.filter((value) => value !== categoryId),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const priceMinor = toMinorUnits(price);
    const parsed = addOnSchema.safeParse({
      name,
      note,
      kind,
      price: priceMinor ?? 0,
      popular,
      active,
      appliesToAll,
      categoryIds: appliesToAll ? [] : categoryIds,
    });
    if (!parsed.success || priceMinor === null) {
      setErrors({
        ...(parsed.success ? {} : z.flattenError(parsed.error).fieldErrors),
        ...(priceMinor === null ? { price: ["Enter a price like 99.00."] } : {}),
      });
      return;
    }

    setErrors({});
    const callbacks = {
      onSuccess: () => onClose(),
      onError: (error: Error) => setErrors(apiFieldErrors(error)),
    };

    if (initial) updateAddOn.mutate({ id: initial.id, ...parsed.data }, callbacks);
    else createAddOn.mutate(parsed.data, callbacks);
  }

  const error = (field: string) => errors[field]?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${id}-name`} label="Name" error={error("name")} className="sm:col-span-2">
            <Input
              id={`${id}-name`}
              data-autofocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={error("name") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-note`}
            label="Note"
            hint="One line. What it is, or what it saves the shopper."
            error={error("note")}
            className="sm:col-span-2"
          >
            <Input
              id={`${id}-note`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="h-11"
            />
          </Field>

          <Field id={`${id}-kind`} label="Kind" error={error("kind")}>
            <Select
              id={`${id}-kind`}
              value={kind}
              onChange={(event) => setKind(event.target.value as AddOnKind)}
              className="h-11"
            >
              {ADD_ON_KINDS.map((value) => (
                <option key={value} value={value}>
                  {ADD_ON_KIND_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field id={`${id}-price`} label={`Price (${CURRENCY})`} error={error("price")}>
            <Input
              id={`${id}-price`}
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              aria-invalid={error("price") ? true : undefined}
              className="h-11"
            />
          </Field>

          <div className="flex flex-col gap-3 sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
              <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
              Offered to shoppers
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
              <input type="checkbox" checked={popular} onChange={(event) => setPopular(event.target.checked)} />
              Tag as &ldquo;Most chosen&rdquo;. It is never pre-ticked.
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={appliesToAll}
                onChange={(event) => setAppliesToAll(event.target.checked)}
              />
              Offer on every product
            </label>
          </div>

          {!appliesToAll && (
            <fieldset className="sm:col-span-2">
              <legend className="eyebrow">Categories</legend>
              {categories.isPending ? (
                <p className="mt-3 text-sm text-ink-muted">Loading…</p>
              ) : categories.isError ? (
                <p className="mt-3 text-sm text-danger">{categories.error.message}</p>
              ) : (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {categories.data.items.map((parent) => (
                    <li key={parent.id} className="rounded-lg border border-line bg-surface p-3">
                      <CategoryCheckbox
                        name={parent.name}
                        checked={categoryIds.includes(parent.id)}
                        onChange={(checked) => toggleCategory(parent.id, checked)}
                      />
                      {parent.children.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-1.5 pl-5">
                          {parent.children.map((child) => (
                            <li key={child.id}>
                              <CategoryCheckbox
                                name={child.name}
                                checked={categoryIds.includes(child.id)}
                                onChange={(checked) => toggleCategory(child.id, checked)}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <FieldError className="mt-2">{error("categoryIds")}</FieldError>
            </fieldset>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        {mutation.isError && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {mutation.error.message}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={mutation.isPending}>
          {initial ? "Save changes" : "Add add-on"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CategoryCheckbox({
  name,
  checked,
  onChange,
}: {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {name}
    </label>
  );
}
