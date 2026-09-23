"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { ImageField } from "@/components/admin/shared/image-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateCategory,
  useGetCategory,
  useGetParentCategories,
  useUpdateCategory,
} from "@/hooks/use-category";
import { apiFieldErrors } from "@/lib/api/api-client";
import { slugify } from "@/lib/utils";
import type { CategoryDetail } from "@/types/category";
import { categorySchema, type CategoryType } from "@/validators/category.validator";

/** Absent to add a category. */
interface CategoryFormModalProps {
  categoryId?: string;
  onClose: () => void;
}

export function CategoryFormModal({ categoryId, onClose }: CategoryFormModalProps) {
  return (
    <Dialog open onClose={onClose} title={categoryId ? "Edit category" : "Add category"}>
      {categoryId ? (
        <EditCategory id={categoryId} onClose={onClose} />
      ) : (
        <CategoryForm onClose={onClose} />
      )}
    </Dialog>
  );
}

function EditCategory({ id, onClose }: { id: string; onClose: () => void }) {
  const category = useGetCategory(id);

  if (category.isPending) {
    return (
      <DialogBody>
        <div aria-busy className="grid gap-5">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </DialogBody>
    );
  }

  if (category.isError) {
    return (
      <>
        <DialogBody>
          <p role="alert" className="text-sm text-danger">
            {category.error.message}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            size="sm"
            loading={category.isFetching}
            onClick={() => category.refetch()}
          >
            Try again
          </Button>
        </DialogFooter>
      </>
    );
  }

  return <CategoryForm initial={category.data} onClose={onClose} />;
}

function CategoryForm({ initial, onClose }: { initial?: CategoryDetail; onClose: () => void }) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [type, setType] = useState<CategoryType>(initial?.type ?? "parent");
  const [parentId, setParentId] = useState<string | null>(initial?.parentId ?? null);
  const [imageId, setImageId] = useState<string | null>(initial?.imageId ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const parents = useGetParentCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const mutation = initial ? updateCategory : createCategory;

  // Its children would end up three levels deep, which the service refuses.
  // Saying so here beats letting the save fail.
  const hasChildren = (initial?.childCount ?? 0) > 0;

  // A category cannot be its own parent.
  const parentOptions = (parents.data?.items ?? []).filter((parent) => parent.id !== initial?.id);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = categorySchema.safeParse({
      name,
      slug,
      type,
      parentId: type === "child" ? parentId : null,
      imageId,
    });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    const callbacks = {
      onSuccess: () => onClose(),
      onError: (error: Error) => setErrors(apiFieldErrors(error)),
    };

    if (initial) updateCategory.mutate({ id: initial.id, ...parsed.data }, callbacks);
    else createCategory.mutate(parsed.data, callbacks);
  }

  const error = (field: string) => errors[field]?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <div className="grid gap-5">
          <Field id={`${id}-name`} label="Category name" error={error("name")}>
            <Input
              id={`${id}-name`}
              data-autofocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugTouched) setSlug(slugify(event.target.value));
              }}
              aria-invalid={error("name") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-slug`}
            label="URL slug"
            error={error("slug")}
            hint={`/collection/${slug || "…"}`}
          >
            <Input
              id={`${id}-slug`}
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              aria-invalid={error("slug") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-type`}
            label="Category type"
            error={error("type")}
            hint={
              hasChildren
                ? "Categories sit under this one, so it has to stay a parent."
                : undefined
            }
          >
            <Select
              id={`${id}-type`}
              value={type}
              disabled={hasChildren}
              onChange={(event) => {
                const next = event.target.value as CategoryType;
                setType(next);
                if (next === "parent") setParentId(null);
              }}
              className="h-11"
            >
              <option value="parent">Parent</option>
              <option value="child">Child</option>
            </Select>
          </Field>

          {type === "child" && (
            <Field
              id={`${id}-parent`}
              label="Parent category"
              error={error("parentId")}
              hint={
                parents.isError
                  ? parents.error.message
                  : !parents.isPending && parentOptions.length === 0
                    ? "There are no parent categories yet. Add one first."
                    : undefined
              }
            >
              <Select
                id={`${id}-parent`}
                value={parentId ?? ""}
                disabled={parents.isPending || parentOptions.length === 0}
                onChange={(event) => setParentId(event.target.value || null)}
                aria-invalid={error("parentId") ? true : undefined}
                className="h-11"
              >
                <option value="">
                  {parents.isPending ? "Loading…" : "Choose a parent category"}
                </option>
                {parentOptions.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <ImageField
            label="Category image"
            value={imageId}
            previewUrl={previewUrl}
            error={error("imageId")}
            onChange={(nextId, nextUrl) => {
              setImageId(nextId);
              setPreviewUrl(nextUrl);
            }}
          />
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
          {initial ? "Save changes" : "Add category"}
        </Button>
      </DialogFooter>
    </form>
  );
}
