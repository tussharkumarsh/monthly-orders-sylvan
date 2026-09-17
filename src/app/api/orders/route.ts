import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { istMonthRange } from "@/lib/date-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // e.g. "2026-09"
    const sort = searchParams.get("sort") ?? "date";
    const order = searchParams.get("order") ?? "desc";
    const search = searchParams.get("search");

    const supabase = createServerSupabaseClient();
    let query = supabase.from("orders").select("*").is("deleted_at", null);

    if (month) {
      const { start, end } = istMonthRange(month);
      query = query.gte("date", start).lt("date", end);
    }

    if (search) {
      query = query.ilike("order_no", `%${search}%`);
    }

    const sortableColumns = ["date", "order_no", "profit", "created_at"];
    const sortColumn = sortableColumns.includes(sort) ? sort : "date";
    query = query.order(sortColumn, { ascending: order === "asc" });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data });
  } catch (err) {
    console.error("Get orders error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
