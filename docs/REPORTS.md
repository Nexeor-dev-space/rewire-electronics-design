# Reports

Governance → **Reports** (`/admin/reports`). A read only dashboard of figures
drawn live from orders, products, stock, returns and warranty records. It
replaces the "Coming soon" placeholder.

Read this before you change `src/lib/reports.ts`,
`src/services/report.service.ts`, the report API route or the screens in
`src/components/admin/reports/`. Change a rule here in the same PR as the code.

---

## 1. What counts as what

The figures below are the contract. Every report uses the same rules, so two
screens can't disagree.

### Sales

An order is a **sale** when both are true (`saleOrderWhere`, `rawIsSale`):

1. Its payment status is Paid, Partially refunded or Refunded
   (`SALE_PAYMENT_STATUSES`).
2. It isn't Cancelled (`NOT_A_SALE_ORDER_STATUS`).

| Figure | Meaning |
| --- | --- |
| Orders placed | Every order in the period, paid or not, cancelled included. Matches the Orders screen |
| Paid orders | Orders that are sales. A fully refunded order still counts |
| Gross sales | Sum of `total` on sales |
| Refunds | Sum of `refundedAmount` on sales |
| Net sales | Gross sales minus refunds |
| Average order value | Net sales per paid order. Shown as a dash, never zero, when there are no paid orders |

Why this rule:

1. **Cash on delivery** isn't a sale until staff mark it paid, because until
   then the money hasn't been received.
2. **A paid order that is then cancelled** is left out at once, even before its
   refund is recorded, so sales aren't overstated while a refund is pending.
3. **A sale belongs to the day the order was placed.** A refund recorded later
   reduces that original day's net sales, so past figures can change when a
   refund is recorded. Returns count a refund against the day the return was
   requested, so the two refund figures can differ for one period.

### Products

| Figure | Meaning |
| --- | --- |
| Products, Products by status | Products not in Trash, as they stand now. Not affected by the date range |
| Units sold | Sum of line `quantity` on sales |
| Sales value | Sum of `lineTotal` on sales. This is before order level discounts and refunds and leaves out delivery, so it won't equal net sales |
| Top sellers | The top `REPORT_TOP_PRODUCTS_LIMIT` (20) by units sold |

Sold figures read the order line's own copy of the product, so a product
deleted later still counts. Top sellers group by `productSlug`.

### Inventory

Stock as it stands now, one row per variant. The date range doesn't apply and
isn't shown. Archived and trashed products are left out, because they aren't for
sale. Stock statuses come from `inventoryStatus`, which reads
`availabilityFromStock`, so they agree with the storefront's badges:

| Status | Stock |
| --- | --- |
| Out of stock | 0 or less |
| Low stock | 1 up to `LOW_STOCK_THRESHOLD` (4), not including it |
| In stock | `LOW_STOCK_THRESHOLD` or more |

### Returns

Return requests, by the day each was requested. Open is
`ACTIVE_RETURN_STATUSES`, closed is `CLOSED_RETURN_STATUSES`. Refunded is the sum
of `refundAmount` on requests whose status is Refunded.

### Warranty

1. **Warranty records** are devices on orders in `WARRANTY_ORDER_STATUSES`, the
   same rule as the Warranty & Claims table (`warrantyDeviceWhere`, now exported
   from `warranty.service.ts`).
2. The date range filters by the day the device was sold; its Pending, Active or
   Expired status is as it stands now (`warrantyStatusWhere`, renamed from
   `statusWhere` and exported).
3. Claims are counted by the day they were raised. Open and closed follow
   `OPEN_WARRANTY_CLAIM_STATUSES`.
4. The warranty status filter also narrows claims, to those on matching devices.

### Other metrics

On sales in the period: discounts given, VAT included, delivery fees, net sales
by payment method and by emirate, and discount codes (top
`REPORT_TOP_COUPONS_LIMIT`, 10, by discount). VAT and delivery are before
refunds. New customer accounts counts registered, active customers created in
the period, without guests.

### Dates

1. A range is two store days, both included, on `STORE_TIME_ZONE`
   (`storeDayStart`, `storeToday` in `src/lib/dates.ts`). A sale at 00:30 on
   1 October in Dubai belongs to 1 October, though it is still 30 September in
   UTC.
2. No dates means all time.
3. Trends go by day up to `REPORT_DAILY_BUCKET_MAX_DAYS` (92), by month beyond
   it and for all time. Quiet days appear as zero (`fillBuckets`).
4. A range can be at most `REPORT_MAX_RANGE_DAYS` (1830).

---

## 2. Filters

Filters sit in one row above the report and apply to everything in it.

| Report | Date range | Other filter |
| --- | --- | --- |
| Sales & orders | Yes | Order status |
| Products | Sold figures only | Product name |
| Inventory | No | Product name, stock status |
| Returns | Yes | Return status |
| Warranty | Yes | Warranty status |
| Other metrics | Yes | None |

The product filter is a name search. It narrows the units, value and top sellers
by the name on the order line, and the product counts by the current name.

Reports refetch on every visit and whenever a filter changes. While new figures
load the old ones stay on screen, dimmed.

---

## 3. API

`GET /api/v1/admin/reports/[report]`, needs `governance.reports` View. `[report]`
is one of `sales`, `products`, `inventory`, `returns`, `warranty`, `other`
(`REPORT_KEYS`); anything else answers 404. The path is
`API_ENDPOINTS.admin.reports.detail(report)`.

| Query | Notes |
| --- | --- |
| `from`, `to` | `YYYY-MM-DD` store days, both or neither. 422 with a message when one is missing, when `from` is after `to`, or when the range is too long |
| `orderStatus`, `returnStatus`, `warrantyStatus`, `inventoryStatus` | Enum values. 422 otherwise |
| `search` | Product name, products and inventory only |
| `page`, `pageSize` | The inventory table only, up to 100 |

A filter that doesn't apply to a report is ignored. Answers are the types in
`src/types/report.ts`: `SalesReport`, `ProductsReport`, `InventoryReport`,
`ReturnsReport`, `WarrantyReport`, `OtherReport`, each with `generatedAt`.

```json
{
  "success": true,
  "data": {
    "generatedAt": "2026-11-02T07:33:00.000Z",
    "period": { "from": "2026-10-04", "to": "2026-11-02", "unit": "day" },
    "totals": { "orders": 118, "paidOrders": 80, "grossSales": 22411200, "refunds": 0, "netSales": 22411200, "averageOrderValue": 280140 },
    "statuses": [{ "key": "CONFIRMED", "label": "Confirmed", "count": 20 }],
    "trend": [{ "bucket": "2026-10-04", "orders": 4, "paidOrders": 2, "grossSales": 500000, "refunds": 0, "netSales": 500000 }]
  }
}
```

Money is in minor units, as everywhere else. Lists in a report are bounded: a
breakdown has one row per enum value, top lists have their limits, and a trend
has at most `REPORT_DAILY_BUCKET_MAX_DAYS` days or one row per month. Only
inventory's table can grow with the data, so only it is paginated.

**Load.** Each report is a handful of aggregate queries and only the open report
is fetched. Sales and returns trends group in the database through `$queryRaw`
rather than loading rows, because Prisma's `groupBy` can't group by a day on the
store's clock.

---

## 4. Screens and files

| File | Purpose |
| --- | --- |
| `src/app/admin/reports/page.tsx` | Permission check, renders the dashboard |
| `src/components/admin/reports/report-dashboard.tsx` | The report picker and the filter row |
| `src/components/admin/reports/report-views.tsx` | One view per report, and the frame they share (loading, error, empty, export) |
| `src/components/admin/reports/report-charts.tsx` | `ReportStat`, `ReportCard`, `BreakdownBars`, `TrendChart`, `ReportTable` |
| `src/hooks/use-report.ts` | `useGetReport`, `useExportReport`, `fetchAllInventoryRows` |
| `src/app/api/v1/admin/reports/[report]/route.ts` | The route |
| `src/services/report.service.ts` | `getReport` and one loader per report |
| `src/lib/reports.ts` | The rules, labels, date ranges, buckets and axis ticks. Client safe |
| `src/lib/reports-export.ts` | What each report's file contains |
| `src/lib/csv.ts` | `toCsv`, `csvHasRows`, `downloadCsv` |
| `src/validators/report.validator.ts` | `reportParamsSchema`, `reportQuerySchema` |
| `src/types/report.ts` | The response types |

**Charts** are hand built, with no chart library. `--report-series` in
`globals.css` is the one hue every mark uses, stepped per palette and checked for
contrast and colour blindness against the admin card surfaces. One measure per
chart, never two scales on one axis. A trend's hover readout also works with the
left and right arrow keys, and "View as table" lists the same figures.

---

## 5. Export

**Export CSV** downloads what the open report shows, built in the browser from
the same answer the screen is using, so the two can't differ. The file starts
with the report name, period, time generated and filters in words, then one
section per card or table, with money in dirhams.

1. Inventory fetches every matching row in pages of `REPORT_EXPORT_PAGE_SIZE`,
   since the screen holds only one page.
2. The button is disabled when the report is empty, and a failed export shows its
   reason beside the button.
3. A text cell that a spreadsheet would run as a formula gets a leading `'`.

---

## 6. Permissions

One module, **Reports** (`PERMISSIONS.reports`, `governance.reports`), View only.
Existing Staff roles hold No access until an Admin sets it on Governance → Roles.
Admin always has it.

Reports shows sales and customer totals across modules, so anyone holding it sees
those totals even without View on Orders or Returns. It shows no individual
customer details.

---

## 7. Changes elsewhere

No database change, migration, environment variable or dependency was added.

1. `warranty.service.ts` exports `warrantyDeviceWhere` and `warrantyStatusWhere`.
2. `dates.ts` gains `storeToday` and `storeDayStart`.
3. `constants.ts` gains the `REPORT_*` limits.
4. `/admin/reports` joins `BUILT_ROUTES`.

---

## 8. Tests

No test files are committed for this module.

The rules, the export and the validator were tested while building. The service
was checked once against a throwaway Postgres holding hand counted
data, covering midnight in Dubai, unpaid, cancelled and refunded orders, archived
and trashed stock, and each filter. The screens were checked in a browser against
the same database, and totals were compared with the Orders, Returns and Warranty
APIs. Those two checks aren't committed.

---

## 9. Known limits

1. **A renamed slug splits a product** in Top sellers, because sold lines keep the
   slug they were bought under.
2. **Net sales for a past period can change** when a refund is recorded later.
   That follows from section 1.
3. **Warranty records** only exist for orders placed since devices were added
   ([WARRANTY.md](WARRANTY.md) §13).
4. **The dashboard's four indicators** at `/admin` are still placeholders. They
   weren't part of this work.
