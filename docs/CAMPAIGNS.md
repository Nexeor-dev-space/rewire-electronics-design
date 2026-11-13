# Campaigns

Marketing → **Campaigns** (`/admin/marketing/campaigns`). A campaign puts a
discount on chosen products for a set time. The discounts change real prices in
the shop, the cart and checkout while the campaign runs. It also holds the
promotional content (section 4) that the later shopper page will show.

Read this before changing campaign rules, campaign prices, or how a discount
code treats a campaign item.

---

## 1. The rules

1. **Only one campaign runs at a time**, across the whole store. This replaces
   the issue's "multiple campaigns running simultaneously", at the product
   owner's request.
2. **Campaigns start and stop by themselves**, from their dates. Nothing runs
   in the background: the status and the price are worked out each time they
   are read.
3. **Each product has one discount**, a percent or a fixed AED amount, applied
   to all of its variants.
4. **A campaign item takes no discount code.** The code still applies to the
   other items in the cart. If nothing else qualifies, the shopper sees "This
   code doesn't apply to the items in your cart."
5. **Stored prices are never changed.** When a campaign stops, prices are back
   to normal with nothing to undo.
6. **Admins manage the campaign types** themselves, from the Campaign types
   button on the list.

Target Audience is left out of this issue, at the product owner's request. The
Campaign URL is saved and checked for uniqueness, but no shopper page opens at
it yet; a later issue builds that page.

---

## 2. Statuses

An admin sets the stored `state`. The status shown everywhere comes from
`campaignStatus(campaign, now)` in `src/lib/pricing/campaign.ts`.

| State | Dates | Status | Discount on |
| --- | --- | --- | --- |
| `DRAFT` | any | Draft | No |
| `PUBLISHED` | before the start | Scheduled | No |
| `PUBLISHED` | from the start until the end | Active | Yes |
| `PAUSED` | before the end | Paused | No |
| `PUBLISHED` or `PAUSED` | from the end | Completed | No |
| `CANCELLED` | any | Cancelled | No |

The start instant counts as live and the end instant as over.

| Status | Actions offered |
| --- | --- |
| Draft | Publish, Cancel |
| Scheduled, Active | Pause, Cancel |
| Paused | Resume, Cancel |
| Completed, Cancelled | None |

A new campaign is always saved as a Draft. There is no free status dropdown,
because going live needs its own permission and three of the statuses follow
from the dates. Instead:

| Screen | How the status changes |
| --- | --- |
| New campaign | **Save as draft**, or **Publish**, shown only with the Publish permission |
| Edit campaign | The Status section shows the current status and the actions above |
| Details | The same actions, in the page header |

**Publish on the new campaign page** makes two calls: it saves the draft, then
sends `PUBLISH`. If the second call fails, for example on an overlap, the draft
is kept, the form stays open with the error, and pressing Publish again updates
that draft rather than creating a second one. No products is refused before
anything is saved.

Actions on the edit page use the last saved details, not what is typed in the
form, and leave the typed values in place. The page says so.

A cancelled campaign can't be restarted; create a new one.

---

## 3. Saving and publishing

| Rule | When | Answer |
| --- | --- | --- |
| Name, type, URL, start and end are required; the end must be after the start | Every save | 422 on the field |
| URL is unique | Every save | 409 on `slug` |
| A fixed discount is below the product's cheapest variant | Every save, and on Publish and Resume | 422 on `products`, naming the product |
| A percent is 1 to 99 | Every save | 422 on `products` |
| At most `MAX_CAMPAIGN_PRODUCTS` (50) products, each once | Every save | 422 on `products` |
| At least one product | Publish, Resume, and any save while published or paused | 422 on `products` |
| The end date is still ahead | Publish, Resume | 422 on `endsAt` |
| The dates don't overlap another campaign | Publish, Resume, and any save while published or paused | 409 on `startsAt`, naming the other campaign |
| Button text and link are filled in together; the link is a site path or `https://` | Every save | 422 on `ctaLabel` or `ctaHref` |
| The banner, images and linked release still exist | Every save | 422 on `bannerImageId`, `imageIds` or `releaseId` |
| At most `MAX_CAMPAIGN_IMAGES` (6) images, each once | Every save | 422 on `imageIds` |
| Promotional text is at most `CAMPAIGN_CONTENT_MAX_LENGTH` (5000) characters | Every save | 422 on `content` |

**Overlaps.** Drafts can overlap anything. A Scheduled, Active or Paused
campaign holds its dates, so a paused campaign can resume. Completed and
Cancelled campaigns hold none. A Postgres advisory lock
(`CAMPAIGN_DATES_LOCK_KEY`) makes two publishes at the same moment take turns,
so exactly one wins.

**A discount that stops making sense.** A variant's price can be lowered after
the campaign was saved. If a fixed discount would then make it free, or a
percent rounds to nothing, `campaignPrice` ignores the discount and charges the
regular price. An item is never free.

---

## 4. Content

All optional, so a campaign without content still saves and publishes.

| Field | Notes |
| --- | --- |
| Banner | One image, through the shared `ImageField` |
| Promotional text | Plain text; line breaks are kept |
| Promotional images | Up to 6, kept in the order they were added |
| Button text and link | Shown as the campaign's call to action |
| Linked release | One release; a product list is already on the campaign |

**Nothing here reaches shoppers yet.** The shopper page comes with a later
issue. `CampaignContent` draws the content on the details page and in the form's
Preview dialog. Preview uses the values as typed and saves nothing, and its
button doesn't navigate.

**Images.** Uploads go through `POST /api/v1/uploads/images`, which now accepts
Campaigns permission. `campaignBanners` and `campaignImages` on `MediaAsset`
count as references in `releaseImage` and `sweepOrphans`, so a campaign's images
are never swept. Replacing or removing an image, or deleting the campaign,
deletes the file once nothing else uses it. Deleting a release clears the link
and keeps the campaign.

---

## 5. Prices

`liveCampaignDiscounts(db, productIds, now)` in `campaign.service.ts` returns
each product's discount from the running campaign. It is one indexed query per
shop listing, product page or cart read, for a bounded list of ids.

| Where | Change |
| --- | --- |
| `catalogue.service.ts` | Shop cards, search, related products, homepage picks and the product page show the campaign price, with the regular price crossed out |
| `cart.service.ts` | Lines are priced with it, and `seenUnitPrice` stores it. A campaign starting or stopping raises the existing `PRICE_CHANGED` notice |
| `lib/pricing/coupon.ts` | `isLineEligible` is false for a line with `campaignDiscounted` |
| `checkout.service.ts` | No change: it charges the priced cart inside its transaction, so the existing `expectedTotal` check catches a price that moved during checkout |

An order stores the price it was charged in `OrderItem.unitPrice`, so later
changes to a campaign never alter a placed order. `Order.discount` still holds
only the discount code, so reports count a campaign saving as a lower sale
price, not as a discount.

While discounted, the crossed out price is the regular price, even when the
variant has a higher `compareAtPrice` of its own.

---

## 6. Data model

`prisma/schema/campaign.prisma`, plus the back relations `Product.campaigns`,
`Release.campaigns`, `MediaAsset.campaignBanners` and `MediaAsset.campaignImages`.

```prisma
enum CampaignState { DRAFT PUBLISHED PAUSED CANCELLED }

model CampaignType {
  id String; name String
  nameKey String @unique        // trimmed, lowercased
  @@map("campaign_types")
}

model Campaign {
  id String; name String; description String
  slug String @unique
  typeId String                 // CampaignType, onDelete Restrict
  startsAt DateTime; endsAt DateTime
  state CampaignState @default(DRAFT)
  content String @default("")
  bannerImageId String?         // MediaAsset, onDelete SetNull
  ctaLabel String?; ctaHref String?
  releaseId String?             // Release, onDelete SetNull
  @@map("campaigns")
}

model CampaignProduct {
  campaignId String             // onDelete Cascade
  productId String              // onDelete Cascade
  discountType CouponType       // the existing PERCENT or FIXED enum
  discountValue Int             // a whole percent, or fils
  @@id([campaignId, productId])
  @@map("campaign_products")
}

model CampaignImage {
  campaignId String             // onDelete Cascade
  mediaId String                // MediaAsset, onDelete Cascade
  sortOrder Int @default(0)
  @@id([campaignId, mediaId])
  @@map("campaign_images")
}
```

Migrations: `20261103095747_add_campgain` adds the first three tables and the
enum. `20261103120717_add_campaign_pciture` adds the content columns and
`campaign_images`; it only adds, and existing campaigns get empty content.

Deleting a campaign is permanent; its last values stay readable in the Change
Log. A type in use can't be removed: the API answers 409 with the count. At most
`MAX_CAMPAIGN_TYPES` (50) types exist, so the dropdown is one bounded query.

---

## 7. API

Paths are in `API_ENDPOINTS.admin.campaigns`; every write is recorded in the
Change Log under Campaigns.

| Route | Permission | Body | Success | Errors |
| --- | --- | --- | --- | --- |
| `GET /api/v1/admin/campaigns?page&pageSize&search&status&typeId&sort` | View | | 200 `Paginated<AdminCampaignListItem>` | 401, 403, 422 |
| `POST /api/v1/admin/campaigns` | Create | `CampaignInput` | 201 `AdminCampaign` (Draft) | 401, 403, 409, 422 |
| `GET /api/v1/admin/campaigns/[id]` | View | | 200 `AdminCampaign` | 401, 403, 404 |
| `PUT /api/v1/admin/campaigns/[id]` | Edit | `CampaignInput` | 200 `AdminCampaign` | 401, 403, 404, 409, 422 |
| `DELETE /api/v1/admin/campaigns/[id]` | Delete | | 200 `{ id }` | 401, 403, 404 |
| `PATCH /api/v1/admin/campaigns/[id]/status` | Publish | `{ action: "PUBLISH" \| "PAUSE" \| "RESUME" \| "CANCEL" }` | 200 `AdminCampaign` | 401, 403, 404, 409, 422 |
| `GET /api/v1/admin/campaign-types?page&pageSize` | View | | 200 `Paginated<AdminCampaignType>` | 401, 403, 422 |
| `POST /api/v1/admin/campaign-types` | Create | `{ name }` | 201 `AdminCampaignType` | 401, 403, 409, 422 |
| `PUT /api/v1/admin/campaign-types/[id]` | Edit | `{ name }` | 200 `AdminCampaignType` | 401, 403, 404, 409, 422 |
| `DELETE /api/v1/admin/campaign-types/[id]` | Delete | | 200 `{ id }` | 401, 403, 404, 409 |

`sort` is `created-desc` (the default), `created-asc`, `start-desc` or
`start-asc`. `status` is any of the six statuses, turned into a date query by
`statusWhere` in the service.

```json
{
  "name": "Black Friday",
  "description": "",
  "slug": "black-friday",
  "typeId": "cm…",
  "startsAt": "2026-11-27T00:00:00.000Z",
  "endsAt": "2026-11-30T20:00:00.000Z",
  "products": [
    { "productId": "cm…", "discountType": "PERCENT", "discountValue": 20 },
    { "productId": "cm…", "discountType": "FIXED", "discountValue": 20000 }
  ],
  "content": "Up to 20% off selected phones.",
  "bannerImageId": "cm…",
  "imageIds": ["cm…", "cm…"],
  "ctaLabel": "Shop the sale",
  "ctaHref": "/collection",
  "releaseId": "cm…"
}
```

The content fields can be left out. `AdminCampaign` also returns
`bannerImageUrl`, `images` as `{ mediaId, url }[]` and `release` as
`{ id, title }`.

---

## 8. Permissions

Module `marketing.campaigns` (`PERMISSIONS.campaigns`), with View, Create, Edit,
Delete and Publish, on the Roles screen as Campaigns. Existing Staff roles hold
No access until an Admin sets a level. Full access is needed to publish, pause,
resume, cancel or delete. Edit can still change the dates and discounts of a
running campaign, just as Edit on Products can change a price.

---

## 9. Files

| File | Purpose |
| --- | --- |
| `prisma/schema/campaign.prisma` | The models |
| `src/lib/pricing/campaign.ts` | `campaignStatus`, `campaignActions`, `campaignPrice`, `campaignVariantPrice` (pure, client safe) |
| `src/services/campaign.service.ts` | Queries, rules and `liveCampaignDiscounts` |
| `src/validators/campaign.validator.ts` | `campaignSchema`, `campaignListQuerySchema`, `campaignStatusSchema`, `campaignTypeSchema` |
| `src/types/campaign.ts` | Response and input types |
| `src/hooks/use-campaign.ts` | Queries and mutations; every mutation invalidates `["campaigns"]` |
| `src/app/api/v1/admin/campaigns/`, `campaign-types/` | The routes |
| `src/app/admin/marketing/campaigns/` | List, `new`, `[id]` and `[id]/edit` pages |
| `src/components/admin/campaigns/` | Table, details, form, content fields, content view, status actions, types dialog, status badge |

---

## 10. Known limits

1. **Shop sort and price filter use the regular price.** Sort reads
   `Product.minPrice` and the filter reads each variant's regular `price`, so a
   phone normally AED 2,100 and now AED 1,800 is missed
   by an "under AED 2,000" filter while its card shows AED 1,800. Fixing it
   needs a heavier query on every shop page, so it was left out on purpose.
2. **No shopper page at the Campaign URL yet.** A later issue builds it.
3. **Fifty products per campaign.** A store wide sale larger than that needs the
   limit raised, or a way to pick by category.
4. **Removing a type asks for no confirmation.** Only an unused type can be
   removed, and it can be added back.
5. **The details page breadcrumb shows the campaign's id**, because breadcrumbs
   are built from the path.
6. **The release list needs its own permission.** Without View on Releases, the
   Linked release field shows the error and offers only the release already
   linked. The rest of the form still saves.
7. **The release list holds the newest 100.** An older release already linked
   stays selectable; a different older one can't be picked.
8. **Preview is not the shopper page.** It shows the content, not the final
   design, because that page doesn't exist yet.
