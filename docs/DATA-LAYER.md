# Data Layer

How to add data to a feature: a Prisma model, an API route, a React Query
hook, and the UI that calls it. Every module (orders, catalogue, cart, users)
follows the same five steps.

Read this before adding a model, an endpoint or a hook.

---

## 1. The flow

```
Prisma model → API route → api-endpoints.ts → module hook → UI
```

| Step | Where | What |
| --- | --- | --- |
| 1. Model | `prisma/schema/<module>.prisma` | Create or update the model |
| 2. Migration | `prisma/migrations/` | Generated, committed **with** the model change |
| 3. API | `src/app/api/v1/<module>/…/route.ts` | Validate input, do the work, return the standard response |
| 4. Endpoint path | `src/lib/api/api-endpoints.ts` | Add the path once |
| 5. Hook | `src/hooks/use-<module>.ts` | React Query queries and mutations for the module |
| 6. UI | components | Call the hook, handle loading / error / empty / data |

Not every change needs every step. A copy change to an existing endpoint is
step 3 only; a new screen over an existing endpoint is steps 5 and 6.

### Files

```
prisma/schema/
├── base.prisma                    generator + datasource only
├── order.prisma
└── …one file per module

src/
├── app/api/v1/<module>/…/route.ts
├── lib/api/
│   ├── api-endpoints.ts           every API path, in one place
│   ├── api-response.ts            apiSuccess() / apiError() — server side
│   └── api-client.ts              apiRequest() — client side, used by hooks
├── validators/<module>.validator.ts   Zod schemas for request input
├── types/<module>.ts              shared TS types for the module
└── hooks/use-<module>.ts          all React Query hooks for the module
```

---

## 2. Prisma model

Each module has its own schema file. Add or change the model there.

```prisma
// prisma/schema/order.prisma
model Order {
  id        String      @id @default(cuid())
  userId    String
  status    OrderStatus @default(PENDING)
  /// Minor units (cents).
  total     Int
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@index([userId])
  @@map("orders")
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  CANCELLED
}
```

- Ids: `String @id @default(cuid())`.
- Every model has `createdAt` and `updatedAt`.
- Table names are plural snake_case via `@@map`.
- Money is `Int` in minor units (cents), same as `Product.price`.

### Migration — same commit as the model

```bash
npm run db:migrate -- --name add-order-status
git add prisma/schema/order.prisma prisma/migrations/
git commit -m "feat(db): add order status"
```

The model change and its migration folder are **always one commit**. Never
edit a migration that is already merged — make a new one.

---

## 3. API route

Create an API when a screen needs to read or change data from the client.

```ts
// src/app/api/v1/orders/[id]/route.ts
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api/api-response";
import { updateOrderSchema } from "@/validators/order.validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return apiError("NOT_FOUND", "We couldn't find that order.", 404);

  return apiSuccess(order);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const input = updateOrderSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  const order = await prisma.order.update({ where: { id }, data: input.data });
  return apiSuccess(order);
}
```

```ts
// src/validators/order.validator.ts
import { z } from "zod";

export const updateOrderSchema = z.object({
  status: z.enum(["PENDING", "PAID", "SHIPPED", "CANCELLED"]),
});
```

Rules:

- **Validate every input** (body, query, params) with a Zod schema before
  using it.
- **Check the session** before touching data, and check the record belongs to
  the user (a shopper can only read or cancel *their* orders).
- **Always return through `apiSuccess` / `apiError`** — never
  `NextResponse.json` directly.
- **Lists are paginated** (`?page=1&pageSize=20`), never an unbounded array.
- **Error messages are for the shopper**: "This order can no longer be
  cancelled", not a stack trace or Prisma error.
- If a Server Component page needs the same query, move it into
  `src/services/<module>.service.ts` and call it from both the page and the
  route, so the page never calls its own API over HTTP.

---

## 4. Response structure

Every endpoint returns this shape, with one exception — binary responses,
described at the end of this section.

```ts
// Success
{ "success": true, "data": { … } }

// Success — list
{ "success": true, "data": { "items": [ … ], "page": 1, "pageSize": 20, "total": 134 } }

// Failure
{
  "success": false,
  "error": {
    "code": "VALIDATION",
    "message": "Please check the highlighted fields.",
    "fields": { "status": ["Invalid option"] }
  }
}
```

```ts
// src/lib/api/api-response.ts
import { NextResponse } from "next/server";

export type ErrorCode =
  | "VALIDATION"        // 422
  | "UNAUTHENTICATED"   // 401
  | "FORBIDDEN"         // 403
  | "NOT_FOUND"         // 404
  | "CONFLICT"          // 409
  | "INTERNAL";         // 500

export interface ApiErrorBody {
  code: ErrorCode | "NETWORK";
  message: string;
  fields?: Record<string, string[] | undefined>;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiErrorBody };

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, { status });
}

export function apiError(
  code: ErrorCode,
  message: string,
  status: number,
  fields?: ApiErrorBody["fields"],
) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error: { code, message, fields } },
    { status },
  );
}
```

`NETWORK` is never sent by the server — the client uses it when the request
itself fails.

Dates arrive on the client as ISO strings, so type them as `string` in
`src/types/<module>.ts`.

### Nested lists

A list whose rows own a small, bounded set of children may carry them inline
rather than making the screen fetch each one. `items` stays the paginated
collection and `total` counts *it*, not the children:

```ts
// GET /api/v1/admin/categories — a page of parents, children nested
{ "items": [{ "id": "…", "name": "Laptops", "children": [ … ] }], "page": 1, "pageSize": 20, "total": 7 }
```

This is for a parent/child pair where the children are bounded by the shape of
the data — a category's subcategories, not a customer's orders. If the nested
set can grow without limit it needs its own paginated endpoint. Say in the
module's doc what `total` counts, because "7" on a screen showing thirty rows
is otherwise a bug report.

### Binary responses

`GET /api/v1/media/[id]` returns raw image bytes with a `Content-Type` header
instead of the envelope, because an image cannot be wrapped in JSON. It is the
only endpoint that does, and it still fails through `apiErrorFrom`, so a
missing id answers in the standard error shape. Add to this list rather than
inventing a second convention.

The matching client exception is `src/lib/api/upload-client.ts`: uploads go
through `XMLHttpRequest` rather than `apiRequest`, because `fetch` cannot
report upload progress. It unwraps the same envelope and throws the same
`ApiError`, so callers cannot tell the difference.

---

## 5. API endpoints file

Every path lives in one file. Hooks import from here — no path strings typed
inside hooks or components.

```ts
// src/lib/api/api-endpoints.ts
const V1 = "/api/v1";

export const API_ENDPOINTS = {
  orders: {
    list: `${V1}/orders`,
    detail: (id: string) => `${V1}/orders/${id}`,
    cancel: (id: string) => `${V1}/orders/${id}/cancel`,
  },
  products: {
    list: `${V1}/products`,
    detail: (slug: string) => `${V1}/products/${slug}`,
  },
} as const;
```

Group by module, fixed paths as strings, paths with ids as functions.

### API client

Hooks call `apiRequest`, which unwraps the standard response: it returns
`data` on success and throws on failure, so React Query's `isError` and
`error` work without extra code.

```ts
// src/lib/api/api-client.ts
import type { ApiErrorBody, ApiResponse } from "./api-response";

export class ApiError extends Error {
  constructor(public readonly body: ApiErrorBody) {
    super(body.message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

export async function apiRequest<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal } = options;
  const search = query
    ? "?" + new URLSearchParams(
        Object.entries(query).flatMap(([k, v]) => (v === undefined ? [] : [[k, String(v)]])),
      )
    : "";

  let json: ApiResponse<T>;
  try {
    const res = await fetch(url + search, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
    json = await res.json();
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError({ code: "NETWORK", message: "We couldn't reach the server. Please try again." });
  }

  if (!json.success) throw new ApiError(json.error);
  return json.data;
}
```

---

## 6. Module hook file

One file per module: `src/hooks/use-<module>.ts`. It holds the query keys and
every query and mutation for that module.

```ts
// src/hooks/use-order.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type { Order, OrderListFilters, UpdateOrderInput } from "@/types/order";

const orderKeys = {
  all: ["orders"] as const,
  list: (filters: OrderListFilters) => ["orders", "list", filters] as const,
  detail: (id: string) => ["orders", "detail", id] as const,
};

/* ---------- queries ---------- */

export function useGetOrders(filters: OrderListFilters = {}) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<Order>>(API_ENDPOINTS.orders.list, { query: filters, signal }),
  });
}

export function useGetOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<Order>(API_ENDPOINTS.orders.detail(id), { signal }),
    enabled: Boolean(id),
  });
}

/* ---------- mutations ---------- */

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateOrderInput & { id: string }) =>
      apiRequest<Order>(API_ENDPOINTS.orders.detail(id), { method: "PATCH", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<Order>(API_ENDPOINTS.orders.cancel(id), { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}
```

Rules:

- **Naming:** `useGet<Thing>` / `useGet<Things>` for queries,
  `use<Verb><Thing>` for mutations (`useUpdateOrder`, `useCancelOrder`).
- **Query keys start with the module name** and live at the top of the file.
- **Every mutation invalidates the module's keys** on success, so lists and
  details refresh.
- **Pass `signal`** in every `queryFn`.
- **No `fetch` or `useEffect` data loading** in components — always a hook.

---

## 7. Using the hook in UI

```tsx
"use client";

import { useCancelOrder, useGetOrders } from "@/hooks/use-order";

export function OrderList() {
  const orders = useGetOrders();
  const cancelOrder = useCancelOrder();

  if (orders.isPending) return <OrderListSkeleton />;
  if (orders.isError) return <ErrorMessage message={orders.error.message} onRetry={orders.refetch} />;
  if (orders.data.items.length === 0) return <EmptyOrders />;

  return (
    <ul>
      {orders.data.items.map((order) => (
        <li key={order.id}>
          {order.id}
          <Button
            loading={cancelOrder.isPending && cancelOrder.variables === order.id}
            onClick={() => cancelOrder.mutate(order.id)}
          >
            Cancel
          </Button>
        </li>
      ))}
    </ul>
  );
}
```

Every screen that loads data handles:

| State | Show |
| --- | --- |
| `isPending` | A skeleton matching the final layout (DESIGN-SYSTEM §8) |
| `isError` | `error.message` and a retry button |
| Empty data | A designed empty state |
| Data | The content |
| Mutation `isPending` | `Button loading`, so it can't be clicked twice |
| Mutation `isError` | `error.message` next to the button or form |

---

## 8. Checklist

- [ ] Model changed in `prisma/schema/<module>.prisma`
- [ ] Migration generated and committed **in the same commit** as the model
- [ ] API route validates input with Zod and checks the session
- [ ] API returns through `apiSuccess` / `apiError`
- [ ] Path added to `api-endpoints.ts`
- [ ] Hook added to `use-<module>.ts`; mutations invalidate the module keys
- [ ] UI handles loading, error, empty and data

---

## 9. Full example — Wishlist

A signed-in shopper can save products, see their saved list, and remove
items. Every file below follows the steps above, in order.

> `getSession()` is real: `src/lib/auth/session.ts`. Admin routes use
> `authorizeApi(permission)` from the same file, which returns the 401 / 403
> for you. Services throw `ServiceError` for expected failures, and a route's
> `catch` returns `apiErrorFrom(error, "<route>")` — both in `api-response.ts`.

### Step 1 — Model

```prisma
// prisma/schema/wishlist.prisma
model WishlistItem {
  id        String   @id @default(cuid())
  userId    String
  productId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, productId])
  @@index([userId, createdAt])
  @@map("wishlist_items")
}
```

`@@unique([userId, productId])` stops the same product being saved twice.

### Step 2 — Migration, same commit

```bash
npm run db:migrate -- --name add-wishlist-items
git add prisma/schema/wishlist.prisma prisma/migrations/
git commit -m "feat(db): add wishlist items"
```

### Step 3 — Validator, types and API routes

```ts
// src/validators/wishlist.validator.ts
import { z } from "zod";

export const wishlistListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const addToWishlistSchema = z.object({
  productId: z.string().min(1, "Choose a product."),
});
```

```ts
// src/types/wishlist.ts
import type { z } from "zod";
import type { addToWishlistSchema, wishlistListQuerySchema } from "@/validators/wishlist.validator";

export interface WishlistItem {
  id: string;
  productId: string;
  /** ISO string — dates are serialised by the API. */
  createdAt: string;
}

export type WishlistFilters = z.input<typeof wishlistListQuerySchema>;
export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>;
```

```ts
// src/app/api/v1/wishlist/route.ts      GET list, POST add
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { apiError, apiSuccess } from "@/lib/api/api-response";
import { addToWishlistSchema, wishlistListQuerySchema } from "@/validators/wishlist.validator";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("UNAUTHENTICATED", "Please sign in to see your wishlist.", 401);

  const query = wishlistListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid page.", 422, z.flattenError(query.error).fieldErrors);
  }

  const { page, pageSize } = query.data;
  const where = { userId: session.user.id };

  const [items, total] = await prisma.$transaction([
    prisma.wishlistItem.findMany({
      where,
      select: { id: true, productId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.wishlistItem.count({ where }),
  ]);

  return apiSuccess({ items, page, pageSize, total });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("UNAUTHENTICATED", "Please sign in to save items.", 401);

  const input = addToWishlistSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please choose a product.", 422, z.flattenError(input.error).fieldErrors);
  }

  // Upsert: saving an already-saved product is not an error.
  const item = await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: session.user.id, productId: input.data.productId } },
    create: { userId: session.user.id, productId: input.data.productId },
    update: {},
    select: { id: true, productId: true, createdAt: true },
  });

  return apiSuccess(item, 201);
}
```

```ts
// src/app/api/v1/wishlist/[productId]/route.ts      DELETE remove
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { apiError, apiSuccess } from "@/lib/api/api-response";

type Params = { params: Promise<{ productId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return apiError("UNAUTHENTICATED", "Please sign in.", 401);

  const { productId } = await params;

  // Filtering by userId is the ownership check: nobody can remove another user's item.
  const { count } = await prisma.wishlistItem.deleteMany({
    where: { userId: session.user.id, productId },
  });
  if (count === 0) return apiError("NOT_FOUND", "That item isn't in your wishlist.", 404);

  return apiSuccess({ productId });
}
```

### Step 4 — Endpoints

```ts
// src/lib/api/api-endpoints.ts
export const API_ENDPOINTS = {
  // …orders, products
  wishlist: {
    list: `${V1}/wishlist`,
    item: (productId: string) => `${V1}/wishlist/${productId}`,
  },
} as const;
```

### Step 5 — Hook file

```ts
// src/hooks/use-wishlist.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type { Paginated } from "@/lib/api/api-response";
import type { AddToWishlistInput, WishlistFilters, WishlistItem } from "@/types/wishlist";

const wishlistKeys = {
  all: ["wishlist"] as const,
  list: (filters: WishlistFilters) => ["wishlist", "list", filters] as const,
};

/* ---------- queries ---------- */

export function useGetWishlist(filters: WishlistFilters = {}) {
  return useQuery({
    queryKey: wishlistKeys.list(filters),
    queryFn: ({ signal }) =>
      apiRequest<Paginated<WishlistItem>>(API_ENDPOINTS.wishlist.list, { query: filters, signal }),
  });
}

/* ---------- mutations ---------- */

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddToWishlistInput) =>
      apiRequest<WishlistItem>(API_ENDPOINTS.wishlist.list, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wishlistKeys.all }),
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      apiRequest<{ productId: string }>(API_ENDPOINTS.wishlist.item(productId), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wishlistKeys.all }),
  });
}
```

### Step 6 — UI

```tsx
// src/components/wishlist/wishlist-list.tsx
"use client";

import { useGetWishlist, useRemoveFromWishlist } from "@/hooks/use-wishlist";

export function WishlistList() {
  const wishlist = useGetWishlist();
  const removeItem = useRemoveFromWishlist();

  if (wishlist.isPending) return <WishlistSkeleton />;
  if (wishlist.isError) {
    return <ErrorMessage message={wishlist.error.message} onRetry={wishlist.refetch} />;
  }
  if (wishlist.data.items.length === 0) return <EmptyWishlist />;

  return (
    <>
      {removeItem.isError && <p role="alert">{removeItem.error.message}</p>}
      <ul>
        {wishlist.data.items.map((item) => (
          <li key={item.id}>
            <WishlistProduct productId={item.productId} />
            <Button
              variant="ghost"
              loading={removeItem.isPending && removeItem.variables === item.productId}
              onClick={() => removeItem.mutate(item.productId)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
```

```tsx
// src/components/product/add-to-wishlist-button.tsx
"use client";

import { useAddToWishlist } from "@/hooks/use-wishlist";

export function AddToWishlistButton({ productId }: { productId: string }) {
  const addToWishlist = useAddToWishlist();

  return (
    <>
      <Button
        variant="secondary"
        loading={addToWishlist.isPending}
        disabled={addToWishlist.isSuccess}
        onClick={() => addToWishlist.mutate({ productId })}
      >
        {addToWishlist.isSuccess ? "Saved" : "Save to wishlist"}
      </Button>
      {addToWishlist.isError && <p role="alert">{addToWishlist.error.message}</p>}
    </>
  );
}
```

### The commits

```
feat(db): add wishlist items               ← wishlist.prisma + migration folder
feat(api): add wishlist endpoints          ← validator, types, routes, api-endpoints.ts
feat(wishlist): add wishlist hooks and UI  ← use-wishlist.ts, components
```
