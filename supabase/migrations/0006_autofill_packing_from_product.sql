-- When a new line item is uploaded for a product that already has a known
-- packing_dimension/packing_weight elsewhere in the table (from any other
-- order of the same product), autofill those instead of leaving them blank.
-- Priority order (first non-null wins):
--   1. The value already saved on this exact (order_no, product_name) row
--      (never overwritten by re-upload, as before).
--   2. The value provided in the uploaded Excel row.
--   3. The most recently updated known value for this product_name from
--      any other order.
create or replace function merge_orders(rows jsonb)
returns table (order_no text, action text, reason text)
language plpgsql
as $$
declare
  row_data jsonb;
  existing orders%rowtype;
  new_order_no text;
  new_date timestamptz;
  new_channel text;
  new_product_name text;
  new_state text;
  new_pincode text;
  new_shipping_through text;
  new_tracking_number text;
  new_product_cost numeric;
  new_selling_price numeric;
  new_shipping_cost numeric;
  new_packing_cost numeric;
  new_packing_dimension text;
  new_packing_weight text;
  known_packing_dimension text;
  known_packing_weight text;
  did_update boolean;
begin
  for row_data in select * from jsonb_array_elements(rows)
  loop
    new_order_no := row_data->>'order_no';
    new_date := (row_data->>'date')::timestamptz;
    new_channel := row_data->>'channel';
    new_product_name := row_data->>'product_name';
    new_state := row_data->>'state';
    new_pincode := row_data->>'pincode';
    new_shipping_through := row_data->>'shipping_through';
    new_tracking_number := row_data->>'tracking_number';
    new_product_cost := (row_data->>'product_cost')::numeric;
    new_selling_price := (row_data->>'selling_price')::numeric;
    new_shipping_cost := nullif(row_data->>'shipping_cost', 'null')::numeric;
    new_packing_cost := nullif(row_data->>'packing_cost', 'null')::numeric;
    new_packing_dimension := row_data->>'packing_dimension';
    new_packing_weight := row_data->>'packing_weight';

    select o.packing_dimension, o.packing_weight
      into known_packing_dimension, known_packing_weight
      from orders o
      where o.product_name = new_product_name
        and (o.packing_dimension is not null or o.packing_weight is not null)
      order by o.updated_at desc
      limit 1;

    select * into existing from orders
      where orders.order_no = new_order_no
        and orders.product_name = new_product_name
        and deleted_at is null
      for update;

    if not found then
      insert into orders (
        order_no, date, channel, product_name, state, pincode,
        shipping_through, tracking_number, product_cost, selling_price,
        shipping_cost, packing_cost, packing_dimension, packing_weight
      ) values (
        new_order_no, new_date, new_channel, new_product_name, new_state, new_pincode,
        new_shipping_through, new_tracking_number, new_product_cost, new_selling_price,
        new_shipping_cost, new_packing_cost,
        coalesce(new_packing_dimension, known_packing_dimension),
        coalesce(new_packing_weight, known_packing_weight)
      );
      order_no := new_order_no;
      action := 'added';
      reason := null;
      return next;
    else
      did_update := false;

      if existing.date is distinct from new_date
        or existing.channel is distinct from new_channel
        or existing.state is distinct from new_state
        or existing.pincode is distinct from new_pincode
        or existing.shipping_through is distinct from new_shipping_through
        or existing.tracking_number is distinct from new_tracking_number
        or existing.product_cost is distinct from new_product_cost
        or existing.selling_price is distinct from new_selling_price
      then
        update orders set
          date = new_date,
          channel = new_channel,
          state = new_state,
          pincode = new_pincode,
          shipping_through = new_shipping_through,
          tracking_number = new_tracking_number,
          product_cost = new_product_cost,
          selling_price = new_selling_price,
          -- shipping_cost and packing_cost are preserved from the existing
          -- record and NEVER overwritten by re-upload.
          packing_dimension = coalesce(
            existing.packing_dimension, new_packing_dimension, known_packing_dimension
          ),
          packing_weight = coalesce(
            existing.packing_weight, new_packing_weight, known_packing_weight
          )
        where id = existing.id;
        did_update := true;
      end if;

      order_no := new_order_no;
      action := case when did_update then 'updated' else 'skipped' end;
      reason := case when did_update then null else 'no changes detected' end;
      return next;
    end if;
  end loop;
end;
$$;
