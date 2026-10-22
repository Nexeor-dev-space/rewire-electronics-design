"use client";

import { useId, useState, type FormEvent } from "react";
import { RefPicker } from "@/components/admin/homepage/ref-picker";
import { SectionItemsEditor, type ItemDraft } from "@/components/admin/homepage/section-items-editor";
import { ImageField } from "@/components/admin/shared/image-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useAddHomepageSection, useUpdateHomepageSection } from "@/hooks/use-homepage";
import { apiFieldErrors } from "@/lib/api/api-client";
import { STORE_TIME_ZONE_LABEL } from "@/lib/constants";
import { formatStoreDateTime, fromStoreDateTimeInput, toStoreDateTimeInput } from "@/lib/dates";
import {
  emptySectionInput,
  itemToInput,
  sectionToInput,
  validateSection,
  type SectionFormInput,
} from "@/lib/homepage-builder";
import {
  SECTION_FIELD_LABELS,
  SECTION_RULES,
  SECTION_TEXT_LIMITS,
  sectionFields,
  type AddableSectionType,
  type HomepageSectionType,
  type SectionTextField,
} from "@/lib/homepage-sections";
import type { HomepageSection, SectionRef } from "@/types/homepage";

type SectionFormModalProps = { onClose: () => void; onSaved?: () => void } & (
  | { section: HomepageSection; type?: never }
  | { section?: never; type: AddableSectionType }
);

/** Fields edited in a textarea; the rest are single line inputs. */
const MULTILINE: readonly SectionTextField[] = ["title", "description"];

const FIELD_HINTS: Partial<Record<SectionTextField, string>> = {
  title: "A new line starts a new line of the heading.",
  ctaHref: "A site path such as /collection, or an https:// link.",
};

/** Adds an addable section, or edits any draft section, under its type's rules. */
export function SectionFormModal({ section, type, onClose, onSaved }: SectionFormModalProps) {
  const sectionType: HomepageSectionType = section ? section.type : type;
  const label = SECTION_RULES[sectionType].label;
  return (
    <Dialog open onClose={onClose} title={section ? `Edit ${label}` : `Add ${label}`}>
      <SectionForm type={sectionType} initial={section} onClose={onClose} onSaved={onSaved} />
    </Dialog>
  );
}

function SectionForm({
  type,
  initial,
  onClose,
  onSaved,
}: {
  type: HomepageSectionType;
  initial?: HomepageSection;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const id = useId();
  const rule = SECTION_RULES[type];
  const [form, setForm] = useState<SectionFormInput>(() =>
    initial ? sectionToInput(initial) : emptySectionInput(),
  );
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? null);
  const [mobileImageUrl, setMobileImageUrl] = useState(initial?.mobileImageUrl ?? null);
  const [refs, setRefs] = useState<SectionRef[]>(initial?.refs ?? []);
  const [items, setItems] = useState<ItemDraft[]>(() =>
    (initial?.items ?? []).map((item) => ({
      key: item.id,
      input: itemToInput(item),
      product: item.product,
      category: item.category,
      imageUrl: item.imageUrl,
    })),
  );
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const addSection = useAddHomepageSection();
  const updateSection = useUpdateHomepageSection();
  const mutation = initial ? updateSection : addSection;

  function set<K extends keyof SectionFormInput>(key: K, value: SectionFormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = {
      ...form,
      refIds: refs.map((ref) => ref.id),
      items: items.map((item) => item.input),
    };

    const localErrors = validateSection(type, body);
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setErrors({});
    const callbacks = {
      onSuccess: () => {
        onSaved?.();
        onClose();
      },
      onError: (error: Error) => setErrors(apiFieldErrors(error)),
    };
    if (initial) updateSection.mutate({ id: initial.id, ...body }, callbacks);
    else addSection.mutate({ type: type as AddableSectionType, ...body }, callbacks);
  }

  const error = (field: string) => errors[field]?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <div className="grid gap-5">
          {sectionFields(type).map((field, index) => {
            const inputId = `${id}-${field}`;
            const label = rule.required.includes(field)
              ? SECTION_FIELD_LABELS[field]
              : `${SECTION_FIELD_LABELS[field]} (optional)`;
            const shared = {
              id: inputId,
              value: form[field] ?? "",
              maxLength: SECTION_TEXT_LIMITS[field],
              "aria-invalid": error(field) ? true : undefined,
              "data-autofocus": index === 0 ? true : undefined,
            };
            return (
              <Field key={field} id={inputId} label={label} hint={FIELD_HINTS[field]} error={error(field)}>
                {MULTILINE.includes(field) ? (
                  <Textarea
                    {...shared}
                    rows={field === "title" ? 2 : 4}
                    onChange={(event) => set(field, event.target.value || null)}
                  />
                ) : (
                  <Input
                    {...shared}
                    className="h-11"
                    onChange={(event) => set(field, event.target.value || null)}
                  />
                )}
              </Field>
            );
          })}

          {rule.image && (
            <ImageField
              label={rule.mobileImage ? "Image, desktop (optional)" : "Image (optional)"}
              value={form.imageId}
              previewUrl={imageUrl}
              error={error("imageId")}
              onChange={(imageId, url) => {
                set("imageId", imageId);
                setImageUrl(url);
              }}
            />
          )}

          {rule.mobileImage && (
            <ImageField
              label="Image, phones (optional — uses the desktop image without one)"
              value={form.mobileImageId}
              previewUrl={mobileImageUrl}
              error={error("mobileImageId")}
              onChange={(imageId, url) => {
                set("mobileImageId", imageId);
                setMobileImageUrl(url);
              }}
            />
          )}

          {rule.schedule && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id={`${id}-starts`}
                label={`Starts, ${STORE_TIME_ZONE_LABEL}`}
                hint={form.startsAt ? formatStoreDateTime(form.startsAt) : undefined}
                error={error("startsAt")}
              >
                <Input
                  id={`${id}-starts`}
                  type="datetime-local"
                  value={toStoreDateTimeInput(form.startsAt ?? null)}
                  className="h-11"
                  onChange={(event) => set("startsAt", fromStoreDateTimeInput(event.target.value))}
                />
              </Field>
              <Field
                id={`${id}-ends`}
                label={`Ends, ${STORE_TIME_ZONE_LABEL}`}
                hint={form.endsAt ? formatStoreDateTime(form.endsAt) : undefined}
                error={error("endsAt")}
              >
                <Input
                  id={`${id}-ends`}
                  type="datetime-local"
                  value={toStoreDateTimeInput(form.endsAt ?? null)}
                  className="h-11"
                  onChange={(event) => set("endsAt", fromStoreDateTimeInput(event.target.value))}
                />
              </Field>
            </div>
          )}

          {rule.refs && (
            <RefPicker value={refs} onChange={setRefs} error={error("refIds")} />
          )}

          {rule.items && (
            <SectionItemsEditor
              type={type}
              kind={rule.items}
              value={items}
              onChange={setItems}
              errors={errors}
            />
          )}

          <div className="flex flex-col gap-3">
            {rule.seasonal && (
              <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  checked={form.seasonal}
                  onChange={(event) => set("seasonal", event.target.checked)}
                />
                Seasonal (shows a &ldquo;Seasonal&rdquo; badge)
              </label>
            )}
            <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(event) => set("visible", event.target.checked)}
              />
              Visible on the homepage
            </label>
          </div>
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
          {initial ? "Save changes" : "Add section"}
        </Button>
      </DialogFooter>
    </form>
  );
}
