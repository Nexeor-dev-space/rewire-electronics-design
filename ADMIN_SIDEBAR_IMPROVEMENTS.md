# Admin Sidebar: Accordion Sections and Retractable Rail

## What changed

Two additions to the admin navigation rail.

1. Section sub titles (OVERVIEW, CATALOGUE, STOREFRONT and the rest) are now
   accordion headers. Clicking one folds or unfolds the rows beneath it.
2. The desktop rail retracts to a narrow glyph only strip, giving the content
   column back roughly 13rem of width.

## Why

The rail lists eight sections and around thirty rows. Everything was expanded
at all times, so the sub titles carried no visual weight and the list ran well
past the fold. Folding sections gives the sub titles a job, and retracting the
whole rail helps on the wide data tables in Products and Orders.

## Files modified

* `src/components/admin/admin-nav.tsx`
* `src/components/admin/admin-shell.tsx`

No new files, no new dependencies, no config or database changes.

## Behaviour

### Accordion sections

* Every section starts unfolded.
* A section header shows a chevron that rotates to face down when open and
  left when closed.
* A section containing the current page is tinted with `bg-surface` so the
  active area is legible even when scrolled.
* Fold state lives in `AdminNavList`. The admin layout persists across
  `/admin/*`, so that state survives route changes rather than resetting.
* When the route moves into a section the user had folded, that section is
  reopened automatically. Otherwise navigating by breadcrumb or by URL would
  hide the very page the user is on.

### Retractable rail

* A toggle sits at the top right of the rail head, desktop only.
* Retracted, the rail is `w-20` and shows the eight section glyphs. Each
  carries a `title` tooltip naming its section.
* Clicking a glyph while retracted reopens the rail with that section
  unfolded, so the retracted rail stays navigable instead of becoming a strip
  of dead icons.
* Below the `lg` breakpoint nothing changes. The rail is still a drawer behind
  the header menu button and always renders full width with labels.

## Implementation notes

### Rail width is a class, not an animated inline style

The content column pads itself to clear the rail with `lg:pl-72` or
`lg:pl-20`. That padding has to stay behind the `lg:` breakpoint, because
below it the drawer floats over the page and there is no rail to clear.

An animated inline style cannot express a breakpoint and would beat the
Tailwind class, pushing mobile content 18rem to the right with nothing
beside it. So both the rail width and the content padding are plain
conditional classes with a CSS `transition`, not Framer Motion values.

The shared `RETRACT` constant in `admin-shell.tsx` holds that transition
(`--duration-base`, `--ease-out-expo`) so the rail, the padding and the toggle
chevron all move together.

### Motion values come from the vocabulary

The accordion still uses Framer Motion, since animating `height: auto` is
awkward in plain CSS. Its timings are taken from `src/lib/motion.ts`
(`DURATION.menu` for the fold, `DURATION.fast` for the chevron) rather than
written inline, per the note at the top of that file.

## Follow up work

* Fold state and rail state are per session. Persisting them to
  `localStorage` would make the console remember a user's layout.
* The retracted rail indexes by section, not by row, because
  `src/lib/admin-nav.ts` declares glyphs per section only. Per row icons
  would allow a true icon rail with flyout menus.
* A keyboard shortcut for the rail toggle.
