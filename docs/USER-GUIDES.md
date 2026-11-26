# User Guides

Written help for both sides of Rewire, with screenshots and a screen recording on each guide.

1. **Customer guides** (11): one per shopper journey. Published on the storefront at `/help` and `/help/<slug>`, linked from the Support page and the footer. Also listed for staff at `/admin/help/customer-guide`.
2. **Admin guides** (one per Admin Panel module, plus Getting started): listed at `/admin/help/admin-guide`, opened at `/admin/help/admin-guide/<slug>`. Every admin screen has a **Help for this screen** link at the top right that opens its guide.

## Why it is built this way

The built in text lives in code, so the index is always complete and nothing needs seeding. Staff with access to Help Guides edit the text and swap screenshots and the recording from the Admin Panel. A saved edit is a row in the database that wins over the built in text, so a wording change needs no deploy. Resetting a guide deletes its row and the built in text shows again.

The production build does not ship `docs/` and the project has no markdown renderer, which is why the guides are not markdown files.

## Where staff edit them

Storefront, then Help Guides, at `/admin/storefront/help-guides`. It lists every guide, marks the ones staff have edited and shows each last updated date. Opening a guide shows the editor: title, summary, recording link, then each section's intro, steps (each with an upload for its screenshot) and notes. Sections and steps can be added, removed and reordered. Save writes the whole guide. Reset to built in text removes the edits.

## Who can see and edit

1. **Reading**: every console user. The Help rows are not permission modules (they are not in `ADMIN_MODULES`).
2. **Editing**: the new module `storefront.help-guides` (`PERMISSIONS.helpGuides`, actions View and Edit). Admins have it. A Staff role gets it from the Roles screen. Staff roles saved before this change have no row for it, so they cannot edit until an admin grants it.
3. The image upload route accepts anyone who can edit Help Guides.

## Guide structure

Every guide has the same five parts, built by `defineGuide` in `src/lib/user-guides/template.ts`: What this is for, Who can do it, Steps, What happens next, Common problems. A module that is still a placeholder uses `unavailableGuide`: one section that says the screen is not yet available and describes nothing planned.

## Files

| File | What it holds |
| --- | --- |
| `prisma/schema/help-guide.prisma` | `HelpGuide` (a staff edited guide) and `HelpGuideImage` (which screenshots a guide uses) |
| `src/lib/user-guides/types.ts` | `Guide`, `GuideSection`, `GuideStep`, `GuideDefinition` |
| `src/lib/user-guides/template.ts` | `defineGuide`, `unavailableGuide`, the five part titles |
| `src/lib/user-guides/customer-guides.ts` | `CUSTOMER_GUIDES`, the built in customer text |
| `src/lib/user-guides/admin-guides.ts` | `ADMIN_GUIDES`, the built in admin text, and `adminGuideSlugFor` |
| `src/lib/user-guides/catalogue.ts` | `GUIDE_TEXT_UPDATED`, lookups and `defaultGuide` |
| `src/lib/user-guides/recording.ts` | `isRecordingUrl`, the rule for a recording link |
| `src/validators/help-guide.validator.ts` | `helpGuideSchema`, `helpGuideParamsSchema` |
| `src/services/help-guide.service.ts` | `listGuides`, `getGuide`, `saveGuide`, `resetGuide` |
| `src/app/api/v1/admin/help-guides/[audience]/[slug]/route.ts` | `PUT` save and `DELETE` reset |
| `src/hooks/use-help-guide.ts` | `useSaveHelpGuide`, `useResetHelpGuide` |
| `src/components/help/` | `GuideBody` (shared by admin and storefront) and `HelpShell` |
| `src/components/admin/help/` | `GuideView`, `GuideIndex`, `GuideEditor`, `HelpLink` |
| `src/app/admin/help/` | The two index routes and their `[slug]` routes |
| `src/app/admin/storefront/help-guides/` | The list and the editor routes |
| `src/app/(site)/help/` | The storefront index and guide pages |

## API

Both routes need the `storefront.help-guides` Edit permission and return the saved guide through `apiSuccess`.

| Method | Path | Does |
| --- | --- | --- |
| PUT | `/api/v1/admin/help-guides/<audience>/<slug>` | Saves the whole guide. Body: `title`, `summary`, `recordingUrl` (an https link to a `.mp4` or `.webm`, or null) and `sections` (each with `id`, `title`, optional `intro`, `steps` of `text` and `imageId`, and `notes`) |
| DELETE | `/api/v1/admin/help-guides/<audience>/<slug>` | Removes the edits and returns the built in text |

`audience` is `customer` or `admin`. A slug that is not in the catalogue answers 404.

The list is not an API: the two list screens are Server Components that call `listGuides`. It is bounded by the guides in code.

## Screenshots and recordings

1. **Sample screenshots**: each built in step points at `public/help-guides/<guide slug>/step-<n>.png`, numbered across the whole guide (`HELP_GUIDE_IMAGE_BASE`). Drop the real screenshot into that path and it shows. A missing file is hidden, so a guide reads fine before its screenshots exist. `browsing/step-1.png` is a placeholder. See `public/help-guides/README.md`.
2. **Uploaded screenshots** upload through the shared image route (`POST /api/v1/uploads/images`), so they follow its limits (PNG, JPEG, WebP or AVIF, 2 MB). Each saved guide records which images it uses in `HelpGuideImage`, so the unused image sweep keeps them.
3. **Recordings** are a link to a video file, not an upload. Video bytes would sit in the database next to the images, and the server is small. Host the clip anywhere that serves a direct https link ending in `.mp4` or `.webm`. Clips are silent, under three minutes, with captions in the video.
4. Capture media on a staging site with fictional data, only after launch fixes to a screen are done.

## Screen sizes

1. **Phones**: the contents list is one column above the guide. A screenshot takes the full width of its section, and tapping it opens the full size file in a new tab so it can be zoomed.
2. **Tablets**: the contents list is two columns above the guide.
3. **From 1024px**: the contents list sits beside the guide and stays on screen while reading. `GuideBody` takes `stickyClassName` for its top offset, because the storefront header and the admin top bar have different heights. `HelpShell` uses `overflow-clip`, since `overflow-hidden` stops the list from sticking.
4. **Wide screens**: the guide list has four columns from 1536px.

## Last updated date

A guide edited by staff shows the date it was saved. A guide with no edits shows `GUIDE_TEXT_UPDATED` in `catalogue.ts`. Change that date when you edit the built in text in code.

## Database

New tables `help_guides` and `help_guide_images`, created by migration `20261123065817_help_guides`. Commit the migration folder with the model change. Until the migration has run on a database, reads fall back to the built in text and saving fails.

No new env variable. No seed.

## Editing the built in text

1. Guides are plain data. Edit the matching file in `src/lib/user-guides/`.
2. Write steps as one sentence each. Use the exact button and screen names from the app.
3. An admin guide's slug is its navigation key in `src/lib/admin-nav.ts`. That is how the Help link finds it. A nested screen uses its parent's guide when it has none.
4. Add a guide by adding it to its file. It appears in the lists on its own.

## Keeping them true

When a screen, button label or flow changes, update the matching guide in the same change, and the screenshots if the screen looks different. The guide text names the real buttons, so a rename makes it wrong.
