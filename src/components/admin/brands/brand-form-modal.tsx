"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { ImageField } from "@/components/admin/shared/image-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateBrand, useGetBrand, useUpdateBrand } from "@/hooks/use-brand";
import { apiFieldErrors } from "@/lib/api/api-client";
import type { BrandDetail } from "@/types/brand";
import { brandSchema } from "@/validators/brand.validator";

/** Absent to add a brand. */
interface BrandFormModalProps {
  brandId?: string;
  onClose: () => void;
}

export function BrandFormModal({ brandId, onClose }: BrandFormModalProps) {
  return (
    <Dialog open onClose={onClose} title={brandId ? "Edit brand" : "Add brand"}>
      {brandId ? <EditBrand id={brandId} onClose={onClose} /> : <BrandForm onClose={onClose} />}
    </Dialog>
  );
}

function EditBrand({ id, onClose }: { id: string; onClose: () => void }) {
  const brand = useGetBrand(id);

  if (brand.isPending) {
    return (
      <DialogBody>
        <div aria-busy className="grid gap-5">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </DialogBody>
    );
  }

  if (brand.isError) {
    return (
      <>
        <DialogBody>
          <p role="alert" className="text-sm text-danger">
            {brand.error.message}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button type="button" size="sm" loading={brand.isFetching} onClick={() => brand.refetch()}>
            Try again
          </Button>
        </DialogFooter>
      </>
    );
  }

  return <BrandForm initial={brand.data} onClose={onClose} />;
}

function BrandForm({ initial, onClose }: { initial?: BrandDetail; onClose: () => void }) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [imageId, setImageId] = useState<string | null>(initial?.imageId ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const mutation = initial ? updateBrand : createBrand;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = brandSchema.safeParse({ name, imageId });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    const callbacks = {
      onSuccess: () => onClose(),
      onError: (error: Error) => setErrors(apiFieldErrors(error)),
    };

    if (initial) updateBrand.mutate({ id: initial.id, ...parsed.data }, callbacks);
    else createBrand.mutate(parsed.data, callbacks);
  }

  const error = (field: string) => errors[field]?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <div className="grid gap-5">
          <Field id={`${id}-name`} label="Brand name" error={error("name")}>
            <Input
              id={`${id}-name`}
              data-autofocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={error("name") ? true : undefined}
              className="h-11"
            />
          </Field>

          <ImageField
            label="Brand image"
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
          {initial ? "Save changes" : "Add brand"}
        </Button>
      </DialogFooter>
    </form>
  );
}
