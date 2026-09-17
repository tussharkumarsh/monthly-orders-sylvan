"use client";

import { useRef, useState } from "react";
import type { UploadResult } from "@/types/order";

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<{ row: number; error: string }[] | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);
    setParseErrors(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/orders/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        if (data.parseErrors) setParseErrors(data.parseErrors);
        return;
      }
      setResult(data);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Upload Orders (Excel)</h1>

      <form onSubmit={handleUpload} className="bg-white border rounded-lg p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Excel File (.xlsx)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            required
            className="block w-full text-sm border rounded px-3 py-2"
          />
          <p className="text-xs text-gray-500 mt-2">
            Required columns: Date, Order No, Channel, Product Name, State, Pincode,
            Shipping Through, Tracking Number, Product Cost, Selling Price, Shipping Cost,
            Packing Dimension, Packing Weight.
          </p>
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="self-start px-5 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload & Merge"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          <p className="font-medium">{error}</p>
          {parseErrors && (
            <ul className="mt-2 text-sm list-disc list-inside">
              {parseErrors.map((pe, i) => (
                <li key={i}>
                  Row {pe.row}: {pe.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Merge Summary</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-semibold text-green-600">{result.added}</p>
              <p className="text-sm text-gray-500">Added</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-blue-600">{result.updated}</p>
              <p className="text-sm text-gray-500">Updated</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-500">{result.skipped}</p>
              <p className="text-sm text-gray-500">Skipped (no changes)</p>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto border-t pt-3">
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-left">
                <tr>
                  <th className="py-1">Order No</th>
                  <th className="py-1">Action</th>
                  <th className="py-1">Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.details.map((d) => (
                  <tr key={d.order_no} className="border-t">
                    <td className="py-1">{d.order_no}</td>
                    <td className="py-1 capitalize">{d.action}</td>
                    <td className="py-1 text-gray-500">{d.reason ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
