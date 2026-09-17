import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { mergeOrders, parseExcelRow } from "@/lib/merge-orders";
import type { ExcelOrderRow } from "@/types/order";

// Canonical field -> accepted header spellings. Extra columns in the sheet
// (Sr No, Fulfillment Status, Profit, ...) are simply ignored since they're
// not looked up here.
const COLUMN_ALIASES: Record<string, string[]> = {
  Date: ["Date"],
  "Order No": ["Order No"],
  Channel: ["Channel"],
  "Product Name": ["Product Name"],
  State: ["State"],
  Pincode: ["Pincode"],
  "Shipping Through": ["Shipping Through"],
  "Tracking Number": ["Tracking Number"],
  "Product Cost": ["Product Cost"],
  "Selling Price": ["Selling Price"],
  "Shipping Cost": ["Shipping Cost", "Shipping Charge"],
  "Packing Cost": ["Packing Cost"],
  "Packing Dimension": ["Packing Dimension", "Product Packing Dimension"],
  "Packing Weight": ["Packing Weight", "Product Packing weight", "Product Packing Weight"],
};

const REQUIRED_FIELDS = [
  "Date",
  "Order No",
  "Channel",
  "Product Name",
  "Product Cost",
  "Selling Price",
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: "Excel file has no sheets" }, { status: 400 });
    }

    const headerRow = worksheet.getRow(1);
    const sheetHeaders: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      sheetHeaders[String(cell.value).trim().toLowerCase()] = colNumber;
    });

    // Resolve each canonical field to whichever alias is present in the sheet.
    const resolvedColumn: Record<string, number | undefined> = {};
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      const match = aliases.find((alias) => alias.toLowerCase() in sheetHeaders);
      resolvedColumn[field] = match ? sheetHeaders[match.toLowerCase()] : undefined;
    }

    const missingRequired = REQUIRED_FIELDS.filter((f) => !resolvedColumn[f]);
    if (missingRequired.length) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingRequired.join(", ")}` },
        { status: 400 }
      );
    }

    const rows: ReturnType<typeof parseExcelRow>[] = [];
    const parseErrors: { row: number; error: string }[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (row.actualCellCount === 0) return;

      const getCell = (field: string) => {
        const col = resolvedColumn[field];
        return col ? row.getCell(col).value : null;
      };
      const getStr = (field: string) => {
        const v = getCell(field);
        return v !== null && v !== undefined && String(v).trim() !== "" ? String(v) : null;
      };
      const getNum = (field: string) => {
        const v = getCell(field);
        return v !== null && v !== undefined && String(v).trim() !== "" ? Number(v) : null;
      };

      const excelRow: ExcelOrderRow = {
        Date: getCell("Date") as string | Date,
        "Order No": getStr("Order No") ?? "",
        Channel: getStr("Channel") ?? "",
        "Product Name": getStr("Product Name") ?? "",
        State: getStr("State") ?? "",
        Pincode: getStr("Pincode") ?? "",
        "Shipping Through": getStr("Shipping Through") ?? "",
        "Tracking Number": getStr("Tracking Number") ?? "",
        "Product Cost": getNum("Product Cost"),
        "Selling Price": getNum("Selling Price") ?? 0,
        "Shipping Cost": getNum("Shipping Cost"),
        "Packing Cost": getNum("Packing Cost"),
        "Packing Dimension": getStr("Packing Dimension"),
        "Packing Weight": getStr("Packing Weight"),
      };

      if (!excelRow["Order No"]) return;

      try {
        rows.push(parseExcelRow(excelRow));
      } catch (err) {
        parseErrors.push({
          row: rowNumber,
          error: err instanceof Error ? err.message : "Invalid row",
        });
      }
    });

    if (parseErrors.length) {
      return NextResponse.json(
        {
          error: "Some rows failed validation. No changes were made (all-or-nothing).",
          parseErrors,
        },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid data rows found in the Excel file" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const result = await mergeOrders(supabase, rows);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
