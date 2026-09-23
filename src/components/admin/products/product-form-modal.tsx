"use client";

import { useId, useState, type FormEvent } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetBrands } from "@/hooks/use-brand";
import { useGetCategories } from "@/hooks/use-category";
import { useCreateProduct, useGetProduct, useUpdateProduct } from "@/hooks/use-product";
import { apiFieldErrors } from "@/lib/api/api-client";
import { conditionLabel, gradeLabel } from "@/lib/catalogue";
import { fromMinorUnits, toMinorUnits } from "@/lib/money";
import { slugify } from "@/lib/utils";
import type { ProductDetail } from "@/types/product";
import {
  GRADED_CONDITIONS,
  PRODUCT_CONDITIONS,
  PRODUCT_GRADES,
  productSchema,
  type ProductCondition,
  type ProductGrade,
} from "@/validators/product.validator";
import { ProductImagesField, type DraftImage } from "./product-images-field";
import { ProductSpecsEditor, newSpecKey, type DraftSpec } from "./product-specs-editor";
import {
  ProductVariantsEditor,
  emptyVariant,
  newVariantKey,
  type DraftVariant,
} from "./product-variants-editor";

const PICKER_FILTERS = { pageSize: 100 } as const;
const DEFAULT_WARRANTY_MONTHS = "12";

type Errors = Record<string, string | undefined>;

function issuesToErrors(issues: z.core.$ZodIssue[]): Errors {
  const errors: Errors = {};
  for (const issue of issues) errors[issue.path.join(".")] ??= issue.message;
  return errors;
}

function serverErrors(error: unknown): Errors {
  const fields = apiFieldErrors(error);
  return Object.fromEntries(Object.entries(fields).map(([key, messages]) => [key, messages?.[0]]));
}

const lines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const optionalNumber = (value: string) => (value.trim() === "" ? null : Number(value));

export function ProductFormModal({
  productId,
  onClose,
}: {
  productId?: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onClose={onClose}
      title={productId ? "Edit product" : "Add product"}
      description={productId ? undefined : "New products start as drafts. Publish from the list."}
      className="max-w-5xl"
    >
      {productId ? (
        <EditProduct id={productId} onClose={onClose} />
      ) : (
        <ProductForm onClose={onClose} />
      )}
    </Dialog>
  );
}

function EditProduct({ id, onClose }: { id: string; onClose: () => void }) {
  const product = useGetProduct(id);

  if (product.isPending) {
    return (
      <DialogBody>
        <div aria-busy className="grid gap-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </DialogBody>
    );
  }

  if (product.isError) {
    return (
      <>
        <DialogBody>
          <p role="alert" className="text-sm text-danger">
            {product.error.message}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button type="button" size="sm" loading={product.isFetching} onClick={() => product.refetch()}>
            Try again
          </Button>
        </DialogFooter>
      </>
    );
  }

  return <ProductForm initial={product.data} onClose={onClose} />;
}

function toDraftVariants(product?: ProductDetail): DraftVariant[] {
  if (!product) return [emptyVariant()];
  return product.variants.map((variant) => ({
    key: newVariantKey(),
    id: variant.id,
    sku: variant.sku,
    storage: variant.storage ?? "",
    colour: variant.colour ?? "",
    colourHex: variant.colourHex ?? "",
    price: fromMinorUnits(variant.price),
    compareAtPrice: fromMinorUnits(variant.compareAtPrice),
    stock: String(variant.stock),
  }));
}

function ProductForm({ initial, onClose }: { initial?: ProductDetail; onClose: () => void }) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [brandId, setBrandId] = useState(initial?.brandId ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [condition, setCondition] = useState<ProductCondition>(initial?.condition ?? "REFURBISHED");
  const [grade, setGrade] = useState<ProductGrade | "">(initial?.grade ?? "");
  const [batteryHealth, setBatteryHealth] = useState(
    initial?.batteryHealth === null || initial?.batteryHealth === undefined ? "" : String(initial.batteryHealth),
  );
  const [warrantyMonths, setWarrantyMonths] = useState(
    initial ? String(initial.warrantyMonths) : DEFAULT_WARRANTY_MONTHS,
  );
  const [highlights, setHighlights] = useState(initial?.highlights.join("\n") ?? "");
  const [included, setIncluded] = useState(initial?.included.join("\n") ?? "");
  const [images, setImages] = useState<DraftImage[]>(initial?.images ?? []);
  const [specs, setSpecs] = useState<DraftSpec[]>(
    initial?.specs.map((spec) => ({ ...spec, key: newSpecKey() })) ?? [],
  );
  const [variants, setVariants] = useState<DraftVariant[]>(() => toDraftVariants(initial));
  const [errors, setErrors] = useState<Errors>({});

  const brands = useGetBrands(PICKER_FILTERS);
  const categories = useGetCategories(PICKER_FILTERS);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const mutation = initial ? updateProduct : createProduct;

  const graded = GRADED_CONDITIONS.includes(condition);
  const error = (path: string) => errors[path];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = productSchema.safeParse({
      name,
      slug,
      description,
      brandId,
      categoryId,
      condition,
      grade: graded && grade ? grade : null,
      batteryHealth: optionalNumber(batteryHealth),
      warrantyMonths: optionalNumber(warrantyMonths) ?? undefined,
      highlights: lines(highlights),
      included: lines(included),
      images: images.map(({ mediaId, alt }) => ({ mediaId, alt })),
      specs: specs.map(({ group, label, value }) => ({ group, label, value })),
      variants: variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        storage: variant.storage,
        colour: variant.colour,
        colourHex: variant.colourHex,
        price: toMinorUnits(variant.price) ?? 0,
        compareAtPrice:
          variant.compareAtPrice.trim() === "" ? null : (toMinorUnits(variant.compareAtPrice) ?? 0),
        stock: optionalNumber(variant.stock),
      })),
    });
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return;
    }

    setErrors({});
    const callbacks = {
      onSuccess: () => onClose(),
      onError: (failure: Error) => setErrors(serverErrors(failure)),
    };

    if (initial) updateProduct.mutate({ id: initial.id, ...parsed.data }, callbacks);
    else createProduct.mutate(parsed.data, callbacks);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <div className="grid gap-8">
          <section className="grid gap-5 sm:grid-cols-2">
            <Field id={`${id}-name`} label="Product name" error={error("name")}>
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

            <Field id={`${id}-slug`} label="URL slug" error={error("slug")} hint={`/product/${slug || "…"}`}>
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
              id={`${id}-brand`}
              label="Brand"
              error={error("brandId")}
              hint={brands.isError ? brands.error.message : undefined}
            >
              <Select
                id={`${id}-brand`}
                value={brandId}
                disabled={brands.isPending}
                onChange={(event) => setBrandId(event.target.value)}
                aria-invalid={error("brandId") ? true : undefined}
                className="h-11"
              >
                <option value="">{brands.isPending ? "Loading…" : "Choose a brand"}</option>
                {brands.data?.items.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              id={`${id}-category`}
              label="Category"
              error={error("categoryId")}
              hint={categories.isError ? categories.error.message : undefined}
            >
              <Select
                id={`${id}-category`}
                value={categoryId}
                disabled={categories.isPending}
                onChange={(event) => setCategoryId(event.target.value)}
                aria-invalid={error("categoryId") ? true : undefined}
                className="h-11"
              >
                <option value="">{categories.isPending ? "Loading…" : "Choose a category"}</option>
                {categories.data?.items.map((parent) => (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>{parent.name}</option>
                    {parent.children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>

            <Field id={`${id}-condition`} label="Condition" error={error("condition")}>
              <Select
                id={`${id}-condition`}
                value={condition}
                onChange={(event) => {
                  const next = event.target.value as ProductCondition;
                  setCondition(next);
                  if (!GRADED_CONDITIONS.includes(next)) setGrade("");
                }}
                className="h-11"
              >
                {PRODUCT_CONDITIONS.map((value) => (
                  <option key={value} value={value}>
                    {conditionLabel(value)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              id={`${id}-grade`}
              label="Grade"
              error={error("grade")}
              hint={graded ? undefined : "Only pre-owned and refurbished products carry a grade."}
            >
              <Select
                id={`${id}-grade`}
                value={grade}
                disabled={!graded}
                onChange={(event) => setGrade(event.target.value as ProductGrade | "")}
                className="h-11"
              >
                <option value="">No grade</option>
                {PRODUCT_GRADES.map((value) => (
                  <option key={value} value={value}>
                    {gradeLabel(value)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field id={`${id}-battery`} label="Battery health (%)" error={error("batteryHealth")}>
              <Input
                id={`${id}-battery`}
                inputMode="numeric"
                value={batteryHealth}
                onChange={(event) => setBatteryHealth(event.target.value)}
                aria-invalid={error("batteryHealth") ? true : undefined}
                className="h-11"
              />
            </Field>

            <Field id={`${id}-warranty`} label="Warranty (months)" error={error("warrantyMonths")}>
              <Input
                id={`${id}-warranty`}
                inputMode="numeric"
                value={warrantyMonths}
                onChange={(event) => setWarrantyMonths(event.target.value)}
                aria-invalid={error("warrantyMonths") ? true : undefined}
                className="h-11"
              />
            </Field>

            <Field
              id={`${id}-description`}
              label="Description"
              error={error("description")}
              className="sm:col-span-2"
            >
              <Textarea
                id={`${id}-description`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>

            <Field
              id={`${id}-highlights`}
              label="Highlights"
              hint="One per line."
              error={error("highlights")}
            >
              <Textarea
                id={`${id}-highlights`}
                value={highlights}
                onChange={(event) => setHighlights(event.target.value)}
                className="min-h-24"
              />
            </Field>

            <Field id={`${id}-included`} label="In the box" hint="One per line." error={error("included")}>
              <Textarea
                id={`${id}-included`}
                value={included}
                onChange={(event) => setIncluded(event.target.value)}
                className="min-h-24"
              />
            </Field>
          </section>

          <ProductImagesField images={images} onChange={setImages} error={error("images")} />

          <ProductVariantsEditor
            variants={variants}
            onChange={setVariants}
            error={error("variants")}
            errorAt={error}
          />

          <ProductSpecsEditor specs={specs} onChange={setSpecs} error={error("specs")} errorAt={error} />
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
          {initial ? "Save changes" : "Add product"}
        </Button>
      </DialogFooter>
    </form>
  );
}
