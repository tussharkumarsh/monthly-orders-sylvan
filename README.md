# Orders Manager

Next.js + Supabase app for managing Shopify/Amazon/Flipkart orders with Excel
upload/export and month-wise profit tracking.

## Setup

1. **Create a Supabase project** at https://supabase.com.

2. **Run the migrations** in the Supabase SQL editor (or `supabase db push`
   with the CLI), in order:
   - `supabase/migrations/0001_create_orders.sql`
   - `supabase/migrations/0002_merge_orders_function.sql`

3. **Environment variables** — copy `.env.local.example` to `.env.local` and
   fill in your Supabase project values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   SUPABASE_SERVICE_KEY=...   # service_role key, server-side only, keep secret
   ```

4. **Install & run**

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000 — it redirects to `/dashboard`.

## Pages

- `/dashboard` — orders table for the selected month, search by Order No,
  inline shipping-cost edit, delete (soft), Excel export.
- `/upload` — upload an Excel file and merge into the database.
- `/edit/[id]` — full edit form for a single order.
- `/monthly-view` — monthly totals and per-channel profit breakdown.

## Excel upload format

This matches the monthly order sheet format (e.g. `august.xlsx`) exactly, so
the same file layout can be re-used every month:

```
Sr No | Date | Order No | Channel | Fulfillment Status | Product Name |
State | Pincode | Shipping Through | Tracking Number |
Product Packing Dimension | Product Packing weight |
Product Cost | Shipping Charge | Packing Cost | Selling Price | Profit
```

Only these columns are actually read (the rest are ignored):
**Date, Order No, Channel, Product Name, State, Pincode, Shipping Through,
Tracking Number, Product Cost, Selling Price** (required), plus
**Shipping Charge** (aka Shipping Cost), **Packing Cost**,
**Product Packing Dimension** (aka Packing Dimension), and
**Product Packing weight** (aka Packing Weight) (all optional). `Sr No`,
`Fulfillment Status`, and `Profit` are ignored — profit is always computed
server-side.

`Channel` must be one of `Shopify`, `Amazon`, `Flipkart`.

### Merge rules

- **New `Order No`** → inserted as a new record.
- **Existing `Order No`** → `shipping_cost`, `packing_cost`,
  `packing_dimension` and `packing_weight` already stored in the database
  are **never overwritten** by the Excel file (these are usually filled in
  manually after upload); other fields are updated only if they differ. If
  nothing differs the row is reported as `skipped`.

The whole upload runs as a single Postgres transaction (via the `merge_orders`
SQL function) — if any row fails validation, no rows are written.

## Deploying

Push to GitHub and import the repo in Vercel, setting the same three
environment variables in the Vercel project settings.
