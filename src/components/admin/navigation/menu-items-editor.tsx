"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminPage } from "@/components/admin/admin-page";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetNavigationDraft,
  useGetNavigationOptions,
  useSaveNavigationDraft,
} from "@/hooks/use-navigation";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { NAVIGATION_ADMIN_PATH } from "@/lib/constants";
import { listParts } from "@/lib/navigation-config";
import type { NavPart } from "@/types/navigation";
import { PartList } from "./part-list";

type MenuKind = "categories" | "drops";

const COPY: Record<MenuKind, { title: string; description: string; empty: string }> = {
  categories: {
    title: "Categories",
    description:
      "The categories in the header Categories menu and the mobile menu. Hide or reorder them. A new category shows after these until you place it.",
    empty: "There are no categories yet. Add them under Categories.",
  },
  drops: {
    title: "Upcoming Drops",
    description:
      "The releases in the header Upcoming Drops menu and the mobile menu, soonest first by default. Hide or reorder them. A new release shows after these until you place it.",
    empty: "There are no upcoming drops. Publish a release under Releases.",
  },
};

/**
 * Show, hide and order the items of one header menu. Save writes them into the
 * navigation draft and returns to the Navigation screen, where Publish makes
 * them live. See docs/NAVIGATION.md.
 */
export function MenuItemsEditor({ kind }: { kind: MenuKind }) {
  const router = useRouter();
  const access = useModuleAccess(PERMISSIONS.navigation);
  const draft = useGetNavigationDraft();
  const options = useGetNavigationOptions();
  const save = useSaveNavigationDraft();
  const [edits, setEdits] = useState<NavPart[] | null>(null);

  const copy = COPY[kind];
  const names = new Map(options.data?.[kind].map((option) => [option.id, option.name]));
  const saved = draft.data && options.data ? listParts(options.data[kind], draft.data.draft.header[kind]) : null;
  const parts = edits ?? saved;

  function onSave() {
    if (!draft.data || !parts) return;
    const { draft: config } = draft.data;
    save.mutate(
      { ...config, header: { ...config.header, [kind]: parts } },
      { onSuccess: () => router.push(NAVIGATION_ADMIN_PATH) },
    );
  }

  const failed = draft.error ?? options.error;
  let content;
  if (failed) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{failed.message}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-5"
          onClick={() => {
            void draft.refetch();
            void options.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  } else if (!parts) {
    content = (
      <div aria-busy className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  } else {
    content = (
      <PartList
        parts={parts}
        nameOf={(id) => names.get(id) ?? id}
        disabled={!access.edit || save.isPending}
        emptyText={copy.empty}
        onChange={setEdits}
      />
    );
  }

  return (
    <AdminPage
      title={copy.title}
      description={copy.description}
      actions={
        <div className="flex items-center gap-2">
          <Link href={NAVIGATION_ADMIN_PATH} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Back
          </Link>
          {access.edit && (
            <Button size="sm" disabled={!parts || !edits} loading={save.isPending} onClick={onSave}>
              Save and go back
            </Button>
          )}
        </div>
      }
    >
      {save.isError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {save.error.message}
        </p>
      )}
      {content}
    </AdminPage>
  );
}
