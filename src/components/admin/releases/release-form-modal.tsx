"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { useGetProducts } from "@/hooks/use-product";
import { useCreateRelease, useUpdateRelease } from "@/hooks/use-release";
import { apiFieldErrors } from "@/lib/api/api-client";
import { PICKER_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatStoreDateTime, fromStoreDateTimeInput, toStoreDateTimeInput } from "@/lib/dates";
import type { AdminRelease } from "@/types/release";
import { RELEASE_END_BEFORE_START, endsBeforeStart, releaseSchema } from "@/validators/release.validator";

function saleWindow(startIso: string, endIso: string | null): string {
  const until = endIso ? `until ${formatStoreDateTime(endIso)}` : "with no end date";
  return `On sale from ${formatStoreDateTime(startIso)} ${until}.`;
}

export function ReleaseFormModal({ release, onClose }: { release?: AdminRelease; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} title={release ? "Edit release" : "Add release"}>
      <ReleaseForm initial={release} onClose={onClose} />
    </Dialog>
  );
}

function ReleaseForm({ initial, onClose }: { initial?: AdminRelease; onClose: () => void }) {
  const id = useId();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [product, setProduct] = useState(initial?.product ?? null);
  const [startsAt, setStartsAt] = useState(toStoreDateTimeInput(initial?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toStoreDateTimeInput(initial?.endsAt ?? null));
  const [active, setActive] = useState(initial?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [productSearchInput, setProductSearchInput] = useState("");
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setProductSearch(productSearchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [productSearchInput]);

  const products = useGetProducts({ pageSize: PICKER_PAGE_SIZE, search: productSearch || undefined });
  const createRelease = useCreateRelease();
  const updateRelease = useUpdateRelease();
  const mutation = initial ? updateRelease : createRelease;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = releaseSchema.safeParse({
      title,
      productId: product?.id ?? "",
      startsAt: fromStoreDateTimeInput(startsAt),
      endsAt: fromStoreDateTimeInput(endsAt),
      active,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string[] | undefined> = z.flattenError(parsed.error).fieldErrors;
      if (!startsAt) fieldErrors.startsAt = ["Enter a start date."];
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    const callbacks = {
      onSuccess: () => onClose(),
      onError: (error: Error) => setErrors(apiFieldErrors(error)),
    };

    if (initial) updateRelease.mutate({ id: initial.id, ...parsed.data }, callbacks);
    else createRelease.mutate(parsed.data, callbacks);
  }

  const error = (field: string) => errors[field]?.[0];
  const startIso = fromStoreDateTimeInput(startsAt);
  const endIso = fromStoreDateTimeInput(endsAt);
  const windowInvalid = startIso !== null && endIso !== null && endsBeforeStart(startIso, endIso);
  const endsError = windowInvalid ? RELEASE_END_BEFORE_START : error("endsAt");

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${id}-title`} label="Title" error={error("title")} className="sm:col-span-2">
            <Input
              id={`${id}-title`}
              data-autofocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-invalid={error("title") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-starts`}
            label="Starts"
            hint="Store time (Dubai)."
            error={error("startsAt")}
          >
            <Input
              id={`${id}-starts`}
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              aria-invalid={error("startsAt") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field id={`${id}-ends`} label="Ends" hint="Optional. Empty means no end." error={endsError}>
            <Input
              id={`${id}-ends`}
              type="datetime-local"
              value={endsAt}
              min={startsAt || undefined}
              onChange={(event) => setEndsAt(event.target.value)}
              aria-invalid={endsError ? true : undefined}
              className="h-11"
            />
          </Field>

          {startIso && !windowInvalid && (
            <p className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink-secondary sm:col-span-2">
              {saleWindow(startIso, endIso)}
            </p>
          )}

          <label className="inline-flex items-center gap-2 text-sm text-ink-secondary sm:col-span-2">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            Active
          </label>

          <fieldset className="sm:col-span-2">
            <legend className="eyebrow">Product</legend>
            {product && (
              <p className="mt-3 text-sm text-ink">
                Selected: <span className="font-medium">{product.name}</span>
              </p>
            )}
            <Input
              type="search"
              value={productSearchInput}
              onChange={(event) => setProductSearchInput(event.target.value)}
              placeholder="Search products by name"
              aria-label="Search products"
              className="mt-3 h-11"
            />
            {products.isPending ? (
              <p className="mt-3 text-sm text-ink-muted">Loading…</p>
            ) : products.isError ? (
              <p className="mt-3 text-sm text-danger">{products.error.message}</p>
            ) : products.data.items.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">No products match.</p>
            ) : (
              <ul className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-line bg-surface p-3">
                {products.data.items.map((item) => (
                  <li key={item.id}>
                    <label className="inline-flex items-center gap-2 py-1 text-sm text-ink-secondary">
                      <input
                        type="radio"
                        name={`${id}-product`}
                        checked={product?.id === item.id}
                        onChange={() => setProduct({ id: item.id, name: item.name })}
                      />
                      {item.name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <FieldError className="mt-2">{error("productId")}</FieldError>
          </fieldset>
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
          {initial ? "Save changes" : "Add release"}
        </Button>
      </DialogFooter>
    </form>
  );
}
