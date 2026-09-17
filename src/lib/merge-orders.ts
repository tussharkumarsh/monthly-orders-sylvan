import type { SupabaseClient } from "@supabase/supabase-js";
import { toIstIso } from "./date-utils";
import type { Channel, ExcelOrderRow, UploadResult } from "@/types/order";

const VALID_CHANNELS: Channel[] = ["Shopify", "Amazon", "Flipkart"];

// Aliases seen in real order sheet exports for the same channel.
const CHANNEL_ALIASES: Record<string, Channel> = {
  "online store": "Shopify",
};

interface ParsedRow {
  order_no: string;
  date: string;
  channel: Channel;
  product_name: string;
  state: string | null;
  pincode: string | null;
  shipping_through: string | null;
  tracking_number: string | null;
  product_cost: number;
  selling_price: number;
  shipping_cost: number | null;
  packing_cost: number | null;
  packing_dimension: string | null;
  packing_weight: string | null;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseExcelRow(row: ExcelOrderRow): ParsedRow {
  const orderNo = str(row["Order No"]);
  if (!orderNo) throw new Error("Missing Order No");

  const channelRaw = str(row["Channel"]) ?? "";
  const channel =
    VALID_CHANNELS.find((c) => c.toLowerCase() === channelRaw.toLowerCase()) ??
    CHANNEL_ALIASES[channelRaw.toLowerCase()];
  if (!channel) {
    throw new Error(`Invalid channel "${channelRaw}" (must be Shopify/Amazon/Flipkart)`);
  }

  const dateValue = row["Date"];
  if (!dateValue) throw new Error("Missing Date");

  const productName = str(row["Product Name"]);
  if (!productName) throw new Error("Missing Product Name");

  return {
    order_no: orderNo,
    date: toIstIso(dateValue as string | Date),
    channel,
    product_name: productName,
    state: str(row["State"]),
    pincode: str(row["Pincode"]),
    shipping_through: str(row["Shipping Through"]),
    tracking_number: str(row["Tracking Number"]),
    product_cost: num(row["Product Cost"]) ?? 0,
    selling_price: num(row["Selling Price"]) ?? 0,
    shipping_cost: num(row["Shipping Cost"]),
    packing_cost: num(row["Packing Cost"]),
    packing_dimension: str(row["Packing Dimension"]),
    packing_weight: str(row["Packing Weight"]),
  };
}

/**
 * Merges parsed Excel rows into the orders table following the rules:
 * - New order_no -> insert full record.
 * - Existing order_no -> keep existing shipping_cost, packing_cost,
 *   packing_dimension, packing_weight; update other fields only if they differ.
 * Runs as a single all-or-nothing transaction via a Postgres RPC.
 */
export async function mergeOrders(
  supabase: SupabaseClient,
  rows: ParsedRow[]
): Promise<UploadResult> {
  const { data, error } = await supabase.rpc("merge_orders", {
    rows: rows,
  });

  if (error) {
    throw new Error(`Merge transaction failed: ${error.message}`);
  }

  const result: UploadResult = { added: 0, updated: 0, skipped: 0, details: [] };
  for (const r of data as {
    order_no: string;
    action: "added" | "updated" | "skipped";
    reason: string | null;
  }[]) {
    result.details.push({
      order_no: r.order_no,
      action: r.action,
      reason: r.reason ?? undefined,
    });
    if (r.action === "added") result.added++;
    else if (r.action === "updated") result.updated++;
    else result.skipped++;
  }
  return result;
}
