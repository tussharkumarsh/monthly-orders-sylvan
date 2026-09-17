import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { istMonthRange } from "@/lib/date-utils";
import type { Order } from "@/types/order";

const COLUMNS: { header: string; key: keyof Order; width: number }[] = [
  { header: "Order No", key: "order_no", width: 18 },
  { header: "Date", key: "date", width: 14 },
  { header: "Channel", key: "channel", width: 12 },
  { header: "Product Name", key: "product_name", width: 30 },
  { header: "State", key: "state", width: 16 },
  { header: "Pincode", key: "pincode", width: 12 },
  { header: "Shipping Through", key: "shipping_through", width: 18 },
  { header: "Tracking Number", key: "tracking_number", width: 20 },
  { header: "Product Cost", key: "product_cost", width: 14 },
  { header: "Selling Price", key: "selling_price", width: 14 },
  { header: "Shipping Cost", key: "shipping_cost", width: 14 },
  { header: "Packing Dimension", key: "packing_dimension", width: 18 },
  { header: "Packing Weight", key: "packing_weight", width: 16 },
  { header: "Profit", key: "profit", width: 14 },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    const supabase = createServerSupabaseClient();
    let query = supabase.from("orders").select("*").is("deleted_at", null);

    if (month) {
      const { start, end } = istMonthRange(month);
      query = query.gte("date", start).lt("date", end);
    }

    query = query.order("date", { ascending: true });

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orders = (data ?? []) as Order[];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Orders", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1D4ED8" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    for (const order of orders) {
      const row = sheet.addRow({
        ...order,
        date: new Date(order.date).toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
      });
      const profitCell = row.getCell("profit");
      profitCell.font = {
        color: { argb: order.profit >= 0 ? "FF15803D" : "FFDC2626" },
      };
    }

    sheet.columns.forEach((col) => {
      if (!col.width) col.width = 14;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = month ? `orders-${month}.xlsx` : "orders-all.xlsx";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 }
    );
  }
}
