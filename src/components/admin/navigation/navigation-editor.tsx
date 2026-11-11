"use client";

import { useState } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDiscardNavigationDraft,
  useGetNavigationDraft,
  usePublishNavigation,
  useRestoreNavigation,
  useSaveNavigationDraft,
} from "@/hooks/use-navigation";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  NAV_ABOUT_COLUMNS_MAX,
  NAV_EXTRA_HEADER_LINKS_MAX,
  NAV_FOOTER_BOTTOM_LINKS_MAX,
  NAV_FOOTER_COLUMNS_MAX,
  NAV_LINKS_PER_GROUP_MAX,
  NAV_MOBILE_TABS_MAX,
  NAV_PREVIEW_PATH,
} from "@/lib/constants";
import { hasUnsavedEdits, navigationErrors } from "@/lib/navigation-builder";
import { NAV_PART_LABELS } from "@/lib/navigation-config";
import { cn } from "@/lib/utils";
import type { NavigationConfig, NavigationDraft } from "@/types/navigation";
import { GroupList } from "./group-list";
import { LinkList } from "./link-list";
import { PartList } from "./part-list";
import { RailList } from "./rail-list";

type TabId = "header" | "footer" | "mobile";
type Confirm = "publish" | "discard" | "restore" | null;

const TABS: { id: TabId; label: string }[] = [
  { id: "header", label: "Header" },
  { id: "footer", label: "Footer" },
  { id: "mobile", label: "Mobile bar" },
];

const BADGE_CLASS = "px-2 py-1 text-[0.625rem]";

/**
 * The Navigation screen: Header, Footer and Mobile bar, edited locally and
 * saved to the draft with Save draft. Shoppers see nothing until Publish.
 * See docs/NAVIGATION.md.
 */
export function NavigationEditor() {
  const access = useModuleAccess(PERMISSIONS.navigation);
  const query = useGetNavigationDraft();
  const save = useSaveNavigationDraft();
  const publish = usePublishNavigation();
  const restore = useRestoreNavigation();
  const discard = useDiscardNavigationDraft();

  const [tab, setTab] = useState<TabId>("header");
  const [edits, setEdits] = useState<NavigationConfig | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const data = query.data;
  // Edits made on this page, else the saved draft. Cleared after every server answer.
  const config = edits ?? data?.draft ?? null;
  const dirty = Boolean(data && edits && hasUnsavedEdits(edits, data.draft));
  const errors = config ? navigationErrors(config) : {};
  const invalid = Object.keys(errors).length > 0;
  const busy = save.isPending || publish.isPending || restore.isPending || discard.isPending;
  const locked = busy || !access.edit;

  function update(change: (current: NavigationConfig) => NavigationConfig) {
    if (!config) return;
    setNotice(null);
    setEdits(change(config));
  }

  function onSaved(message: string) {
    return () => {
      setEdits(null);
      setNotice(message);
    };
  }

  const confirmMutation = confirm === "publish" ? publish : confirm === "restore" ? restore : discard;

  function runConfirm() {
    const done = (message: string) => ({
      onSuccess: () => {
        onSaved(message)();
        setConfirm(null);
        confirmMutation.reset();
      },
    });
    if (confirm === "publish") publish.mutate(undefined, done("Published. Shoppers see it on the next page load."));
    else if (confirm === "restore") restore.mutate(undefined, done("The previous version is live again."));
    else if (confirm === "discard") discard.mutate(undefined, done("The draft now matches what is live."));
  }

  function cancelConfirm() {
    setConfirm(null);
    confirmMutation.reset();
  }

  let content;
  if (query.isPending) {
    content = <EditorSkeleton />;
  } else if (query.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{query.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (config) {
    content = (
      <>
        <div role="tablist" aria-label="Navigation sections" className="mb-5 flex gap-1 border-b border-line">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors",
                tab === item.id
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-secondary hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "header" && (
          <div className="flex flex-col gap-8">
            <Block title="Top bar" hint="The row with the logo, search, account and cart. Hide a part or move it with the arrows.">
              <PartList
                parts={config.header.topBar}
                nameOf={(id) => NAV_PART_LABELS[id]}
                disabled={locked}
                onChange={(topBar) => update((c) => ({ ...c, header: { ...c.header, topBar } }))}
              />
            </Block>
            <Block
              title="Menu bar"
              hint={`The row under it. Hide or move Categories, Upcoming Drops and About, or add up to ${NAV_EXTRA_HEADER_LINKS_MAX} links of your own, for example Sale. Open Categories or Upcoming Drops to choose which of their items show.`}
            >
              <RailList
                items={config.header.rail}
                path="header.rail"
                errors={errors}
                disabled={locked}
                max={NAV_EXTRA_HEADER_LINKS_MAX}
                unsaved={dirty}
                onChange={(rail) => update((c) => ({ ...c, header: { ...c.header, rail } }))}
              />
            </Block>
            <Block
              title="About menu"
              hint={`Up to ${NAV_ABOUT_COLUMNS_MAX} columns, each with up to ${NAV_LINKS_PER_GROUP_MAX} links. The support box beside them is fixed.`}
            >
              <GroupList
                groups={config.header.aboutColumns}
                path="header.aboutColumns"
                errors={errors}
                disabled={locked}
                max={NAV_ABOUT_COLUMNS_MAX}
                noun="column"
                onChange={(aboutColumns) =>
                  update((c) => ({ ...c, header: { ...c.header, aboutColumns } }))
                }
              />
            </Block>
          </div>
        )}

        {tab === "footer" && (
          <div className="flex flex-col gap-8">
            <Block title="Top row" hint="The brand block and the link columns. Hide a part or move it.">
              <PartList
                parts={config.footer.top}
                nameOf={(id) => NAV_PART_LABELS[id]}
                disabled={locked}
                onChange={(top) => update((c) => ({ ...c, footer: { ...c.footer, top } }))}
              />
            </Block>
            <Block
              title="Columns"
              hint={`Up to ${NAV_FOOTER_COLUMNS_MAX} columns, each with up to ${NAV_LINKS_PER_GROUP_MAX} links.`}
            >
              <GroupList
                groups={config.footer.columns}
                path="footer.columns"
                errors={errors}
                disabled={locked}
                max={NAV_FOOTER_COLUMNS_MAX}
                noun="column"
                onChange={(columns) => update((c) => ({ ...c, footer: { ...c.footer, columns } }))}
              />
            </Block>
            <Block title="Base" hint="The bottom bar and the large watermark under it. Hide a part or move it.">
              <PartList
                parts={config.footer.base}
                nameOf={(id) => NAV_PART_LABELS[id]}
                disabled={locked}
                onChange={(base) => update((c) => ({ ...c, footer: { ...c.footer, base } }))}
              />
            </Block>
            <Block
              title="Bottom bar links"
              hint={`Up to ${NAV_FOOTER_BOTTOM_LINKS_MAX} small links beside the copyright line, for example Privacy and Terms.`}
            >
              <LinkList
                links={config.footer.bottomLinks}
                path="footer.bottomLinks"
                errors={errors}
                disabled={locked}
                max={NAV_FOOTER_BOTTOM_LINKS_MAX}
                addLabel="Add link"
                emptyText="No bottom bar links."
                onChange={(bottomLinks) =>
                  update((c) => ({ ...c, footer: { ...c.footer, bottomLinks } }))
                }
              />
            </Block>
          </div>
        )}

        {tab === "mobile" && (
          <Block
            title="Tabs"
            hint={`Up to ${NAV_MOBILE_TABS_MAX} tabs in the bar at the foot of phones and small tablets. A tab linking to Cart shows the item count, one linking to the category list opens it, and one linking to Account shows the sign in options when signed out.`}
          >
            <LinkList
              links={config.mobileBar.tabs}
              path="mobileBar.tabs"
              errors={errors}
              disabled={locked}
              max={NAV_MOBILE_TABS_MAX}
              addLabel="Add tab"
              emptyText="No tabs. The bar is not shown."
              isTab
              onChange={(tabs) => update((c) => ({ ...c, mobileBar: { tabs } }))}
            />
          </Block>
        )}
      </>
    );
  }

  return (
    <AdminPage
      title="Navigation"
      description="The header About menu, the footer and the mobile bottom bar. Changes stay in a draft until you publish."
      actions={
        data && (
          <div className="flex flex-wrap items-center gap-2">
            <PublishStatus data={data} dirty={dirty} />
            <Button
              variant="outline"
              size="sm"
              disabled={dirty}
              title={dirty ? "Save the draft to preview it" : undefined}
              onClick={() => window.open(NAV_PREVIEW_PATH, "_blank", "noopener")}
            >
              Preview
            </Button>
            {access.edit && (
              <Button size="sm" disabled={!dirty || invalid || busy} loading={save.isPending} onClick={() => save.mutate(config!, { onSuccess: onSaved("Saved to the draft. Shoppers see it after you publish.") })}>
                Save draft
              </Button>
            )}
            {access.publish && (
              <>
                <Button variant="outline" size="sm" disabled={busy || !data.canRestore} onClick={() => setConfirm("restore")}>
                  Restore previous
                </Button>
                <Button variant="outline" size="sm" disabled={busy || !(dirty || data.hasUnpublishedChanges)} onClick={() => setConfirm("discard")}>
                  Discard draft
                </Button>
                <Button size="sm" disabled={busy || dirty || invalid || !data.hasUnpublishedChanges} onClick={() => setConfirm("publish")}>
                  Publish
                </Button>
              </>
            )}
          </div>
        )
      }
    >
      {notice && (
        <p role="status" className="mb-4 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink">
          {notice}
        </p>
      )}
      {save.isError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {save.error.message}
        </p>
      )}
      {invalid && dirty && (
        <p role="alert" className="mb-4 text-sm text-danger">
          Fix the highlighted fields to save.
        </p>
      )}
      {dirty && !invalid && (
        <p role="status" className="mb-4 text-sm text-ink-secondary">
          You have unsaved edits. Save the draft to preview or publish them.
        </p>
      )}

      {content}

      <ConfirmDialog
        open={confirm !== null}
        title={confirmTitle(confirm)}
        description={confirmDescription(confirm)}
        confirmLabel={confirm === "publish" ? "Publish" : confirm === "restore" ? "Restore" : "Discard draft"}
        error={confirmMutation.isError ? confirmMutation.error.message : undefined}
        loading={confirmMutation.isPending}
        onCancel={cancelConfirm}
        onConfirm={runConfirm}
      />
    </AdminPage>
  );
}

function confirmTitle(confirm: Confirm): string {
  if (confirm === "publish") return "Publish the navigation?";
  if (confirm === "restore") return "Restore the previous version?";
  if (confirm === "discard") return "Discard the draft?";
  return "";
}

function confirmDescription(confirm: Confirm): string | undefined {
  if (confirm === "publish") {
    return "Shoppers see the draft as it is now on their next page load. The version it replaces is kept so you can restore it.";
  }
  if (confirm === "restore") {
    return "The previous version goes live now and the draft becomes a copy of it. Edits in the draft are lost. The version being replaced is kept, so you can undo this.";
  }
  if (confirm === "discard") {
    return "Every change since the last publish is lost. The draft goes back to what shoppers see.";
  }
  return undefined;
}

function Block({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-medium text-ink">{title}</h2>
      <p className="mb-3 mt-1 text-sm text-ink-secondary">{hint}</p>
      {children}
    </section>
  );
}

function PublishStatus({ data, dirty }: { data: NavigationDraft; dirty: boolean }) {
  if (dirty) {
    return (
      <Badge variant="warn" className={BADGE_CLASS}>
        Unsaved edits
      </Badge>
    );
  }
  if (data.hasUnpublishedChanges) {
    return (
      <Badge variant="warn" className={BADGE_CLASS}>
        Unpublished changes
      </Badge>
    );
  }
  if (!data.publishedAt) return <Badge className={BADGE_CLASS}>Original navigation</Badge>;
  return (
    <Badge variant="live" className={BADGE_CLASS}>
      Published{" "}
      {new Date(data.publishedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}
    </Badge>
  );
}

function EditorSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-3">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
