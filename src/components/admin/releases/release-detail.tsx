"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { LoadError } from "@/components/admin/orders/order-shared";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProduct, useGetProducts } from "@/hooks/use-product";
import {
  useChangeReleaseState,
  useDeleteRelease,
  useGetRelease,
  useSetReleaseAllocations,
  useUpdateRelease,
} from "@/hooks/use-release";
import { ApiError, apiFieldErrors } from "@/lib/api/api-client";
import { PERMISSIONS, type ModuleAccess } from "@/lib/auth/permissions";
import { conditionLabel } from "@/lib/catalogue";
import { PICKER_PAGE_SIZE, RELEASE_ALLOCATIONS_MAX, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatStoreDateTime } from "@/lib/dates";
import {
  RELEASE_STATE_ACTIONS,
  RELEASE_STATE_ACTION_LABELS,
  allowedEdits,
  canChangeState,
  canDeleteRelease,
  type ReleaseEdits,
  type ReleaseStateAction,
} from "@/lib/releases";
import type { NamedRef } from "@/types/product";
import type { AdminReleaseDetail, ReleaseAllocationRow } from "@/types/release";
import { releaseAllocationsSchema } from "@/validators/release.validator";
import {
  ReleaseFields,
  parseReleaseForm,
  releaseFormValues,
  type FieldErrors,
} from "./release-form-modal";
import { RELEASES_ADMIN_PATH, ReleaseBadges } from "./release-shared";
import { ReleaseWaitlist } from "./release-waitlist";

const NO_EDITS: ReleaseEdits = {
  text: false,
  hidden: false,
  maxPerCustomer: false,
  startsAt: false,
  endsAt: false,
  allocations: false,
};

type Confirm = "END" | "DELETE" | null;

interface DraftRow {
  variantId: string;
  sku: string;
  storage: string | null;
  colour: string | null;
  condition: ReleaseAllocationRow["condition"];
  stock: number;
  product: NamedRef;
  allocated: string;
}

function toDraft(row: ReleaseAllocationRow): DraftRow {
  return {
    variantId: row.variantId,
    sku: row.sku,
    storage: row.storage,
    colour: row.colour,
    condition: row.condition,
    stock: row.stock,
    product: row.product,
    allocated: String(row.allocated),
  };
}

function variantLabel(row: Pick<DraftRow, "storage" | "colour" | "condition">): string {
  return [row.storage, row.colour, conditionLabel(row.condition)].filter(Boolean).join(" · ");
}

function BackLink() {
  return (
    <Link
      href={RELEASES_ADMIN_PATH}
      className="text-sm text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
    >
      All releases
    </Link>
  );
}

export function ReleaseDetailScreen({ id }: { id: string }) {
  const release = useGetRelease(id);
  const access = useModuleAccess(PERMISSIONS.releases);

  if (release.isPending) {
    return (
      <AdminPage title="Release" actions={<BackLink />}>
        <DetailSkeleton />
      </AdminPage>
    );
  }

  if (release.isError) {
    const notFound = release.error instanceof ApiError && release.error.body.code === "NOT_FOUND";
    return (
      <AdminPage title={notFound ? "Release not found" : "Release"} actions={<BackLink />}>
        {notFound ? (
          <AdminEmptyState title="Release not found" description="It may have been deleted." />
        ) : (
          <LoadError message={release.error.message} onRetry={() => release.refetch()} />
        )}
      </AdminPage>
    );
  }

  return <ReleaseDetailBody release={release.data} access={access} />;
}

function ReleaseDetailBody({ release, access }: { release: AdminReleaseDetail; access: ModuleAccess }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const changeState = useChangeReleaseState();
  const deleteRelease = useDeleteRelease();

  const actions = access.edit
    ? RELEASE_STATE_ACTIONS.filter((action) => canChangeState(release.status, action))
    : [];
  const canDelete = access.delete && canDeleteRelease(release.status);

  function runAction(action: ReleaseStateAction) {
    changeState.mutate(
      { id: release.id, action },
      { onSuccess: () => setConfirm(null) },
    );
  }

  function closeConfirm() {
    setConfirm(null);
    changeState.reset();
    deleteRelease.reset();
  }

  function confirmAction() {
    if (confirm === "END") runAction("END");
    if (confirm === "DELETE") {
      deleteRelease.mutate(release.id, { onSuccess: () => router.push(RELEASES_ADMIN_PATH) });
    }
  }

  const confirmError =
    confirm === "END" && changeState.isError
      ? changeState.error.message
      : confirm === "DELETE" && deleteRelease.isError
        ? deleteRelease.error.message
        : undefined;

  return (
    <AdminPage
      title={release.title}
      description={[release.edition, `Opens ${formatStoreDateTime(release.startsAt)}`].filter(Boolean).join(" · ")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ReleaseBadges status={release.status} hidden={release.hidden} />
          {actions.map((action) => (
            <Button
              key={action}
              variant={action === "PUBLISH" ? undefined : "outline"}
              size="sm"
              loading={changeState.isPending && changeState.variables.action === action}
              disabled={changeState.isPending}
              onClick={() => (action === "END" ? setConfirm("END") : runAction(action))}
            >
              {RELEASE_STATE_ACTION_LABELS[action]}
            </Button>
          ))}
          {canDelete && (
            <Button variant="outline" size="sm" onClick={() => setConfirm("DELETE")}>
              Delete
            </Button>
          )}
          <BackLink />
        </div>
      }
    >
      {changeState.isError && confirm === null && (
        <p role="alert" className="mb-5 text-sm text-danger">
          {changeState.error.message}
        </p>
      )}

      <div className="flex flex-col gap-6">
        <Panel title="Details">
          <DetailsForm release={release} canEdit={access.edit} />
        </Panel>
        <Panel
          title="Allocations"
          hint={`Units of each variant set aside for this release. Up to ${RELEASE_ALLOCATIONS_MAX} variants.`}
        >
          <AllocationsPanel release={release} canEdit={access.edit} />
        </Panel>
        <Panel title="Waitlist" hint="Everyone who joined this release, oldest first.">
          <ReleaseWaitlist release={release} />
        </Panel>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "END" ? `End ${release.title}?` : `Delete ${release.title}?`}
        description={
          confirm === "END"
            ? "The release closes now and nothing more can be sold through it."
            : "The release and its allocations are removed. This can't be undone."
        }
        confirmLabel={confirm === "END" ? RELEASE_STATE_ACTION_LABELS.END : "Delete release"}
        error={confirmError}
        loading={changeState.isPending || deleteRelease.isPending}
        onCancel={closeConfirm}
        onConfirm={confirmAction}
      />
    </AdminPage>
  );
}

function DetailsForm({ release, canEdit }: { release: AdminReleaseDetail; canEdit: boolean }) {
  const [values, setValues] = useState(() => releaseFormValues(release));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const updateRelease = useUpdateRelease();
  const edits = canEdit ? allowedEdits(release.status) : NO_EDITS;

  function handleChange(next: typeof values) {
    setValues(next);
    setSaved(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = parseReleaseForm(values, {
      ...(!edits.startsAt && { startsAt: release.startsAt }),
      ...(!edits.endsAt && { endsAt: release.endsAt }),
      ...(!edits.maxPerCustomer && { maxPerCustomer: release.maxPerCustomer }),
    });
    if (parsed.errors) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    updateRelease.mutate(
      { id: release.id, ...parsed.data },
      {
        onSuccess: () => setSaved(true),
        onError: (error) => setErrors(apiFieldErrors(error)),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ReleaseFields values={values} onChange={handleChange} errors={errors} edits={edits} />
      {canEdit && (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {updateRelease.isError && (
            <p role="alert" className="mr-auto text-sm text-danger">
              {updateRelease.error.message}
            </p>
          )}
          {saved && <p className="mr-auto text-sm text-ink-secondary">Saved.</p>}
          <Button type="submit" size="sm" loading={updateRelease.isPending}>
            Save details
          </Button>
        </div>
      )}
    </form>
  );
}

function AllocationsPanel({ release, canEdit }: { release: AdminReleaseDetail; canEdit: boolean }) {
  const [rows, setRows] = useState(() => release.allocations.map(toDraft));
  const [rowErrors, setRowErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [picking, setPicking] = useState(false);
  const setAllocations = useSetReleaseAllocations();

  const editable = canEdit && allowedEdits(release.status).allocations;
  const server = new Map(release.allocations.map((row) => [row.variantId, row]));

  function update(next: DraftRow[]) {
    setRows(next);
    setSaved(false);
  }

  function addRows(added: DraftRow[]) {
    update([...rows, ...added]);
    setPicking(false);
  }

  function handleSave() {
    const allocations = rows.map((row) => ({
      variantId: row.variantId,
      allocated: row.allocated.trim() === "" ? Number.NaN : Number(row.allocated),
    }));
    const parsed = releaseAllocationsSchema.safeParse({ allocations });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      let general: string | undefined;
      for (const issue of parsed.error.issues) {
        const index = issue.path[1];
        const row = typeof index === "number" ? rows[index] : undefined;
        if (row) errors[row.variantId] = issue.message;
        else general = issue.message;
      }
      setRowErrors(errors);
      setFormError(general);
      return;
    }

    setRowErrors({});
    setFormError(undefined);
    setAllocations.mutate(
      { id: release.id, allocations: parsed.data.allocations },
      {
        onSuccess: (data) => {
          setRows(data.allocations.map(toDraft));
          setSaved(true);
        },
        onError: (error) => {
          const fields = apiFieldErrors(error);
          setRowErrors(Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value?.[0]])));
          setFormError(error.message);
        },
      },
    );
  }

  return (
    <div>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface-2 px-4 py-8 text-center text-sm text-ink-secondary">
          No products allocated yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-4xl text-left text-sm">
            <thead className="border-b border-line bg-surface-2">
              <tr>
                <th className="eyebrow px-4 py-3 font-normal">Product</th>
                <th className="eyebrow px-4 py-3 font-normal">Variant</th>
                <th className="eyebrow px-4 py-3 text-right font-normal">In stock</th>
                <th className="eyebrow px-4 py-3 font-normal">Allocated</th>
                <th className="eyebrow px-4 py-3 text-right font-normal">Reserved</th>
                <th className="eyebrow px-4 py-3 text-right font-normal">Sold</th>
                <th className="eyebrow px-4 py-3 text-right font-normal">Returned</th>
                <th className="eyebrow px-4 py-3 text-right font-normal">Remaining</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const current = server.get(row.variantId);
                const used = (current?.reserved ?? 0) + (current?.sold ?? 0) + (current?.returned ?? 0);
                const error = rowErrors[row.variantId];
                return (
                  <tr key={row.variantId} className="border-b border-line align-top last:border-b-0">
                    <td className="px-4 py-3 text-ink">{row.product.name}</td>
                    <td className="px-4 py-3">
                      <p className="text-ink-secondary">{variantLabel(row)}</p>
                      <p className="font-mono text-xs text-ink-muted">{row.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-secondary">{row.stock}</td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={row.allocated}
                        disabled={!editable}
                        onChange={(event) =>
                          update(
                            rows.map((item, i) => (i === index ? { ...item, allocated: event.target.value } : item)),
                          )
                        }
                        aria-label={`Allocated units of ${row.product.name} ${row.sku}`}
                        aria-invalid={error ? true : undefined}
                        className="h-9 w-24"
                      />
                      {error && <p className="mt-1 max-w-48 text-xs text-danger">{error}</p>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-secondary">{current?.reserved ?? 0}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-secondary">{current?.sold ?? 0}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-secondary">{current?.returned ?? 0}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">
                      {current?.available ?? (Number(row.allocated) || 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editable && used === 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => update(rows.filter((_, i) => i !== index))}
                          aria-label={`Remove ${row.product.name} ${row.sku}`}
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm tabular-nums text-ink-secondary">
        Allocated {release.allocated} · Sold {release.sold} · Remaining {release.remaining}
      </p>

      {editable && (
        <>
          {picking ? (
            <AddProductPicker
              existing={new Set(rows.map((row) => row.variantId))}
              onAdd={addRows}
              onCancel={() => setPicking(false)}
            />
          ) : (
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setPicking(true)}>
              Add product
            </Button>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            {formError && (
              <p role="alert" className="mr-auto text-sm text-danger">
                {formError}
              </p>
            )}
            {saved && <p className="mr-auto text-sm text-ink-secondary">Allocations saved.</p>}
            <Button type="button" size="sm" loading={setAllocations.isPending} onClick={handleSave}>
              Save allocations
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function AddProductPicker({
  existing,
  onAdd,
  onCancel,
}: {
  existing: Set<string>;
  onAdd: (rows: DraftRow[]) => void;
  onCancel: () => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState("");
  const products = useGetProducts({ pageSize: PICKER_PAGE_SIZE, search: search || undefined });

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  let list: ReactNode;
  if (products.isPending) list = <p className="mt-3 text-sm text-ink-muted">Loading…</p>;
  else if (products.isError) list = <p className="mt-3 text-sm text-danger">{products.error.message}</p>;
  else if (products.data.items.length === 0) list = <p className="mt-3 text-sm text-ink-muted">No products match.</p>;
  else {
    list = (
      <ul className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-line bg-surface p-3">
        {products.data.items.map((item) => (
          <li key={item.id}>
            <label className="inline-flex items-center gap-2 py-1 text-sm text-ink-secondary">
              <input
                type="radio"
                name="release-add-product"
                checked={productId === item.id}
                onChange={() => setProductId(item.id)}
              />
              {item.name}
              <span className="text-xs text-ink-muted">({item.variantCount} variants)</span>
            </label>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-line bg-surface-2 p-4">
      <Input
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search products by name"
        aria-label="Search products"
        className="h-10"
      />
      {list}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        {productId && <AddVariantsButton productId={productId} existing={existing} onAdd={onAdd} />}
      </div>
    </div>
  );
}

function AddVariantsButton({
  productId,
  existing,
  onAdd,
}: {
  productId: string;
  existing: Set<string>;
  onAdd: (rows: DraftRow[]) => void;
}) {
  const product = useGetProduct(productId);

  if (product.isPending) {
    return (
      <Button type="button" size="sm" loading disabled>
        Add variants
      </Button>
    );
  }
  if (product.isError) return <p className="text-sm text-danger">{product.error.message}</p>;

  const fresh = product.data.variants.filter((variant) => !existing.has(variant.id));
  if (fresh.length === 0) return <p className="text-sm text-ink-muted">All its variants are already listed.</p>;

  const productRef = { id: product.data.id, name: product.data.name };
  return (
    <Button
      type="button"
      size="sm"
      onClick={() =>
        onAdd(
          fresh.map((variant) => ({
            variantId: variant.id,
            sku: variant.sku,
            storage: variant.storage,
            colour: variant.colour,
            condition: variant.condition,
            stock: variant.stock,
            product: productRef,
            allocated: "0",
          })),
        )
      }
    >
      Add {fresh.length} {fresh.length === 1 ? "variant" : "variants"}
    </Button>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="eyebrow">{title}</h2>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
