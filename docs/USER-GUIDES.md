# User Guides

Two step by step guides live inside the Admin Panel, under a **Help** area at the bottom of the sidebar:

1. **Admin Guide** at `/admin/help/admin-guide`: how to run the shop from the console.
2. **Customer Guide** at `/admin/help/customer-guide`: how a shopper uses the website, so staff can support them.

## Why they are here

The guides are part of the console, so staff open them without leaving it. They are not a public page and not a markdown file, because the production build does not ship `docs/` and the project has no markdown renderer.

## Who can see them

Every console user. The two Help rows are not permission modules (they are not in `ADMIN_MODULES`), so `visibleAdminNav` shows them to any role. There is no database change, no migration and no new env variable.

## Files

| File | What it holds |
| --- | --- |
| `src/lib/user-guides/types.ts` | `UserGuide`, `GuideSection`, `GuideGroup`, `GuideTable` |
| `src/lib/user-guides/admin-guide.ts` | `ADMIN_GUIDE`, the admin content |
| `src/lib/user-guides/customer-guide.ts` | `CUSTOMER_GUIDE`, the shopper content |
| `src/components/admin/help/guide-view.tsx` | `GuideView`: contents list, numbered steps, groups, tables, notes |
| `src/app/admin/help/admin-guide/page.tsx` | The Admin Guide route |
| `src/app/admin/help/customer-guide/page.tsx` | The Customer Guide route |
| `src/lib/admin-nav.ts` | The `help` area and its two rows |
| `src/app/admin/[...slug]/page.tsx` | Both routes added to `BUILT_ROUTES` |

## Editing a guide

Guides are plain data. Edit the matching file in `src/lib/user-guides/`.

1. A guide has `title`, `description` and `sections`.
2. A section has a unique `id` (the anchor in the contents list), a `title` and any of: `intro`, `steps`, `groups` (named lists of steps), `table` and `notes`.
3. Write steps as one sentence each. Use the exact button and screen names from the app.
4. Add a section by adding an object to `sections`. It appears in the contents list on its own.

```ts
{
  id: "coupons",
  title: "Discount Codes",
  steps: ["Go to Marketing, then Discount Codes.", "Click add."],
  notes: ["A used code cannot be deleted."],
}
```

## Keeping them true

When a screen, button label or flow changes, update the matching guide in the same change. The guide text names the real buttons, so a rename makes it wrong.
