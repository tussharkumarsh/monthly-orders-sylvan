-- Product Cost is frequently left blank in the sheet for repeat products
-- (it's a per-product constant, same idea as packing dimension/weight).
-- Treat a blank or zero product_cost from the upload the same way: never
-- overwrite an already-saved value, and autofill blanks from the most
-- recently known non-zero cost for that product_name.
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
  known_product_cost numeric;
  effective_product_cost numeric;
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
    new_product_cost := nullif(row_data->>'product_cost', 'null')::numeric;
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

    select o.product_cost
      into known_product_cost
      from orders o
      where o.product_name = new_product_name
        and o.product_cost is not null
        and o.product_cost <> 0
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
        new_shipping_through, new_tracking_number,
        coalesce(nullif(new_product_cost, 0), known_product_cost, 0),
        new_selling_price,
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
      effective_product_cost := coalesce(
        nullif(new_product_cost, 0), existing.product_cost, known_product_cost, 0
      );

      if existing.date is distinct from new_date
        or existing.channel is distinct from new_channel
        or existing.state is distinct from new_state
        or existing.pincode is distinct from new_pincode
        or existing.shipping_through is distinct from new_shipping_through
        or existing.tracking_number is distinct from new_tracking_number
        or existing.product_cost is distinct from effective_product_cost
        or existing.selling_price is distinct from new_selling_price
      then
        update orders set
          date = new_date,
          channel = new_channel,
          state = new_state,
          pincode = new_pincode,
          shipping_through = new_shipping_through,
          tracking_number = new_tracking_number,
          product_cost = effective_product_cost,
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
