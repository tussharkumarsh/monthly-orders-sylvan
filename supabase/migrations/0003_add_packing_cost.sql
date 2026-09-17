-- Adds packing_cost (a manually-entered cost, like shipping_cost) and
-- extends the profit formula to match the real order sheet:
-- profit = selling_price - (product_cost + shipping_cost + packing_cost)
alter table orders drop column if exists profit;
alter table orders add column if not exists packing_cost numeric(12,2);
alter table orders add column profit numeric(12,2) generated always as
  (selling_price - product_cost - coalesce(shipping_cost, 0) - coalesce(packing_cost, 0)) stored;
