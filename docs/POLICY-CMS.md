# Policy CMS

The six storefront policy pages, edited from the admin console instead of from
source. This document covers the shape of the data, the decisions behind it,
and how to run it locally.

Read this before adding a policy, changing a policy URL, or touching the
rich-text pipeline.

---

## 1. What this is

Warranty, Terms & Conditions, Shipping, FAQ, Privacy and Returns were
hardcoded in `src/lib/legal.ts`, `src/lib/faqs.ts` and `src/lib/support.ts`.
They are now rows in the database, edited at
`/admin/storefront/content/<slug>` and rendered by the storefront from that
single source. A copy change is a save, not a deployment.

Each policy is one `Policy` row — a title, an introductory sub-text (the
*lede*) and an ordered list of `PolicyBlock` rows. A block is a section title
and its rich-text content, rendered title-left / content-right.

### Files

| File | Purpose |
| --- | --- |
| `prisma/schema.prisma` | `Policy` and `PolicyBlock` models |
| `prisma/seed.ts` | The six policies, seeded from the old hardcoded copy |
| `src/lib/policy-types.ts` | Slugs, routes, labels, rich-text types, anchors |
| `src/lib/policies.ts` | Cached server reads |
| `src/lib/rich-text.ts` | Validation on write, plain-text flattening |
| `src/lib/faq-entry.ts` | Policy → FAQ accordion adapter |
| `src/lib/db.ts`, `src/lib/db-url.ts` | Prisma client and the connection string |
| `src/app/admin/storefront/content/` | Console list, editor route, `savePolicy` |
| `src/components/admin/policy/` | The editor and its block rows |
| `src/components/policy/` | The storefront document, page shell and renderer |
| `src/components/ui/rich-text-editor.tsx` | The TipTap surface |

---

## 2. Slugs and routes

A slug is stable for the life of a policy. It is never derived from the title,
and editing the title never touches it — that is what stops a rename from
breaking a URL. `POLICY_SLUGS` in `src/lib/policy-types.ts` is the list, and
`isPolicySlug` is the only accepted way to narrow a string to one.

| Slug | Route |
| --- | --- |
| `warranty` | `/warranty` |
| `terms-and-conditions` | `/terms` |
| `shipping` | `/shipping` |
| `faq` | `/faq` |
| `privacy-policy` | `/privacy` |
| `returns-refunds-cancellation` | `/returns-refunds-cancellation` |

Four routes match their slug. Two do not. `/terms` and `/privacy` were built
before this feature and are linked from the footer, the About menu and the
checkout summary, so they keep the URLs they have; the longer spellings
redirect *to* them in `next.config.ts` rather than the other way round, so no
live URL moves. `/support/warranty`, `/support/shipping`, `/support/faq`,
`/support/returns`, `/returns` and `/refunds` redirect as well. A fragment
never reaches the server, so `/support#warranty` cannot be redirected.

`POLICY_ROUTES` is the one map. The header, footer, About panel, support page
and the revalidation calls all read it, so a policy cannot be listed in one
place and routed somewhere else. `policyLink(slug)` returns the
`{ label, href }` shape every menu uses.

Nav labels (`POLICY_NAV_LABELS`) are static and deliberately *not* the
admin-managed `Policy.title`. The header and footer render on every route in
the site; sourcing their labels from the database would make every page wait on
a query to draw its chrome. The page title is admin-managed, which is what the
requirement actually asks for.

The six routes are separate files rather than one `[slug]` segment. A dynamic
segment at the root of `(site)` would sit in front of every other storefront
route and swallow unmatched paths, and two of the six do not have URLs matching
their slug anyway. `PolicyPage` in `src/components/policy/policy-page.tsx`
holds the body so each route file stays a metadata export and a component.

---

## 3. Rich text

Content is stored as a TipTap **JSON document tree**, never as an HTML string.
That single decision is why there is no sanitiser in this codebase: no markup
ever crosses the boundary, so there is nothing to escape. The storefront walks
the tree and emits real React elements in `src/components/policy/rich-text.tsx`.

The stored subset is narrow and declared as `RichTextNode` in
`src/lib/policy-types.ts`: paragraph, heading (2–3), bullet list, ordered list,
list item, hard break, and the bold / italic / link marks. StarterKit's
blockquote, code, code block, horizontal rule, strike and underline are all
switched off in the editor, because a control that produces something the
validator then silently drops is worse than no control — the author would watch
their formatting disappear on save with no explanation.

Two gates, both of which must stay:

1. **`validateRichText` on write.** Every save runs through it. Unrecognised
   nodes are dropped rather than stored. Link marks are checked against an
   allowlist of `http:`, `https:`, `mailto:` and `tel:`, plus same-page anchors
   and site-relative paths — but not protocol-relative `//evil.com`, which a
   browser resolves as absolute. An unsafe href drops the mark, never the text.
   It never throws and never returns null: unrecognisable input becomes an empty
   document, so a malformed payload cannot take a policy page down.
2. **Unknown node types render nothing.** The renderer is the second half of
   the same rule, so a row written by hand or by an older migration cannot
   produce a broken page either.

Headings: the page title is the `h1` and each block title is the `h2`, so
content headings start at `h3`. A level outside the range is clamped rather
than dropped, because the author meant a heading.

`richTextToPlainText` flattens a document for the `FAQPage` JSON-LD and for
meta descriptions. Inline siblings (text, hard breaks) join with nothing so a
bolded word does not split mid-word; block-level siblings join with a space so
two paragraphs — or two bullets — do not run into each other.

**JSON-LD is escaped.** `JSON.stringify` escapes neither `<` nor `</script>`,
and FAQ questions are admin-authored, so `faqJsonLd` in
`src/components/home/faq/faq.tsx` replaces `<` with `<` before the string
reaches `dangerouslySetInnerHTML`. Any future JSON-LD built from stored content
must do the same.

---

## 4. Anchors

Every block has an anchor, used for `/terms#returns` style deep links — the
checkout summary links to exactly that one today.

`uniqueAnchor(title, taken)` is called **only when a block is created**. Once a
block has an anchor it keeps it, even when its title is reworded, because the
anchor is a shared URL and a link that silently moves is worse than an
inelegant one. `savePolicy` enforces this by deciding update-vs-create from the
block ids it read inside the transaction, so an existing block is always
updated in place.

Anchors are unique per policy (`@@unique([policyId, anchor])`), and a collision
gets a `-2`, `-3` suffix.

---

## 5. Saving

`savePolicy` in `src/app/admin/storefront/content/actions.ts` writes the whole
document in one transaction. Nothing reaches the storefront until it succeeds,
which is what makes Cancel meaningful in the editor: it restores the snapshot
the page loaded with, and no write ever happened.

The transaction:

1. Reads the policy and its block ids.
2. Updates title, lede, draft and published.
3. Deletes blocks the payload no longer carries.
4. Updates or creates each submitted block, with the array index as `sortOrder`.

Two rules the write path depends on:

- **The update-vs-create decision comes from the database, not the payload.**
  A block id is honoured only if it belongs to *this* policy; the update is
  additionally scoped `where: { id, policyId }`. A foreign or stale id falls
  through to `create` on the correct policy rather than writing across
  policies.
- **Order is positional.** A drag reorders the array in the editor and needs no
  separate write; `sortOrder` is assigned from the index on save.

The action returns the re-read `PolicyData`, and the editor seeds its state
from that rather than from what it sent. This matters: `router.refresh()`
re-renders the server component but preserves client state by design, so a
block added in the console would otherwise keep `id: null` forever and be
deleted-and-recreated — with a new anchor — on the next save.

Reordering uses `framer-motion`'s `Reorder`, already a dependency and already
under the app's `MotionConfig reducedMotion="user"`. No drag-and-drop library
was added. Dragging is restricted to the handle via `dragControls`, because a
whole-row drag would start on every attempt to select a word in the row's text
input.

### Caching

Reads go through `unstable_cache` in `src/lib/policies.ts`, tagged
`policy:<slug>` and `policies`. `savePolicy` revalidates both tags plus
`revalidatePath` for the policy's own route, and `/` as well when the FAQ
changes, since the homepage renders the same rows. `readPolicy` is the uncached
read and is what the action uses to return the saved document — reading through
the cache in the same request that revalidated it can still serve the stale
value.

### Not yet done

**There is no authentication or authorization on `/admin`.** Server Actions are
public POST endpoints; until a session guard exists, anyone who can reach
`/admin/storefront/content/<slug>` can call `savePolicy`. This is tracked
separately and must land before the console is exposed.

There is also no optimistic-concurrency guard: two editors saving the same
policy will overwrite each other silently. Add a `updatedAt` check to the
transaction when more than one person edits policies.

---

## 6. FAQ

FAQ is a policy row like the other five and is edited with the same editor, but
it renders differently on purpose: a block's title is a question and its content
is the answer, so the accordion is the right shape and the left/right block
layout is not. `toFaqEntries` in `src/lib/faq-entry.ts` is the one adapter
between the two shapes, and it lives in `lib` because two surfaces need it —
`/faq` and the homepage section — and neither should have to know how a policy
block is put together.

`/faq` passes the policy's own title and lede into the homepage's `Faq`
section, so editing them in the console changes the page's `h1`. The title is
split on its last space to set over two lines.

The FAQ section no longer appears at the bottom of the other policy pages. It
exists once, as its own page, plus the homepage section that renders the same
rows.

Emptiness is decided by the callers, not by `Faq`: the homepage omits the
section when there are no questions, while `/faq` still renders its heading and
lede so the route never answers 200 with a blank body.

---

## 7. Database

### Connection

`DATABASE_URL` is the only variable. `src/lib/db-url.ts` is the single
resolver — it trims the value and throws a clear error when it is unset — and
all three consumers import it: the runtime client (`src/lib/db.ts`), the CLI
config (`prisma7.config.ts`) and the seed (`prisma/seed.ts`), so they cannot
end up pointed at different databases.

The trim is not cosmetic. A leading space in `.env` produces Prisma's
`P1013: The provided database string is invalid`, which reads like a malformed
URL rather than stray whitespace.

```
DATABASE_URL=postgresql://user:password@localhost:5432/rewire_locale
```

No quotes, no space after `=`. `db-url.ts` deliberately has no imports and no
`server-only`, because `prisma7.config.ts` loads it outside the Next runtime.

### Setup

```
npx prisma generate     # regenerates src/generated/prisma (also runs on postinstall)
npx prisma migrate dev  # applies prisma/migrations
npx prisma db seed      # loads the six policies
```

`prisma migrate status` should report no pending migration and no drift. If it
wants to generate a migration you did not ask for, the schema and the migration
history have diverged — check that before applying anything.

The seed is idempotent and replaces each policy's blocks wholesale, so it
overwrites anything edited through the console. That is the point of a seed,
and why it is not wired into `postinstall`.

### Schema

`Policy` carries `slug` (unique), `title`, `eyebrow`, `lede`, `draft`,
`published` and timestamps. `published: false` makes the storefront route 404
rather than render an empty page. `draft: true` renders the "not yet through
legal review" notice on the page — said plainly rather than buried, because
placeholder copy that looks like a reviewed policy is worse than no page at
all.

`PolicyBlock` carries `policyId`, `anchor`, `title`, `content` (JSONB),
`sortOrder` and timestamps, with `onDelete: Cascade`, a unique
`[policyId, anchor]` and an index on `[policyId, sortOrder]`.

---

## 8. Adding a policy

1. Add the slug to `POLICY_SLUGS`, its route to `POLICY_ROUTES` and its label
   to `POLICY_NAV_LABELS` in `src/lib/policy-types.ts`.
2. Add the route file under `src/app/(site)/`, exporting
   `generateMetadata = () => policyMetadata(slug)` and a component that returns
   `<PolicyPage slug={slug} />`.
3. Add the row — through the seed, or through the console once the row exists.

The console list, the admin editor route, the revalidation and the About panel
all read `POLICY_SLUGS` and `POLICY_ROUTES`, so nothing else needs touching.

Do not add a second rich-text editor. `src/components/ui/rich-text-editor.tsx`
is the only one, and the validator and renderer are written against exactly
what it emits.
