import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { mergeOrders, parseExcelRow } from "@/lib/merge-orders";
import type { ExcelOrderRow } from "@/types/order";

const EXPECTED_HEADERS = [
  "Date",
  "Order No",
  "Channel",
  "Product Name",
  "State",
  "Pincode",
  "Shipping Through",
  "Tracking Number",
  "Product Cost",
  "Selling Price",
  "Shipping Cost",
  "Packing Dimension",
  "Packing Weight",
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
    const headerMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      headerMap[String(cell.value).trim()] = colNumber;
    });

    const missingHeaders = EXPECTED_HEADERS.filter((h) => !(h in headerMap));
    if (missingHeaders.length) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingHeaders.join(", ")}` },
        { status: 400 }
      );
    }

    const rows: ReturnType<typeof parseExcelRow>[] = [];
    const parseErrors: { row: number; error: string }[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (row.actualCellCount === 0) return;

      const getCell = (header: string) => row.getCell(headerMap[header]).value;

      const excelRow: ExcelOrderRow = {
        Date: getCell("Date") as string | Date,
        "Order No": String(getCell("Order No") ?? ""),
        Channel: String(getCell("Channel") ?? ""),
        "Product Name": String(getCell("Product Name") ?? ""),
        State: String(getCell("State") ?? ""),
        Pincode: String(getCell("Pincode") ?? ""),
        "Shipping Through": String(getCell("Shipping Through") ?? ""),
        "Tracking Number": String(getCell("Tracking Number") ?? ""),
        "Product Cost": Number(getCell("Product Cost") ?? 0),
        "Selling Price": Number(getCell("Selling Price") ?? 0),
        "Shipping Cost":
          getCell("Shipping Cost") !== null && getCell("Shipping Cost") !== undefined && getCell("Shipping Cost") !== ""
            ? Number(getCell("Shipping Cost"))
            : null,
        "Packing Dimension": getCell("Packing Dimension")
          ? String(getCell("Packing Dimension"))
          : null,
        "Packing Weight": getCell("Packing Weight")
          ? String(getCell("Packing Weight"))
          : null,
      };

      if (!excelRow["Order No"] || excelRow["Order No"].trim() === "") return;

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
