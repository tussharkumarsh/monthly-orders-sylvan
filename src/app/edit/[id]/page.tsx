"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Order } from "@/types/order";
import { formatIst } from "@/lib/date-utils";

const EDITABLE_TEXT_FIELDS: { key: keyof Order; label: string }[] = [
  { key: "state", label: "State" },
  { key: "pincode", label: "Pincode" },
  { key: "shipping_through", label: "Shipping Through" },
  { key: "tracking_number", label: "Tracking Number" },
  { key: "packing_dimension", label: "Packing Dimension" },
  { key: "packing_weight", label: "Packing Weight" },
];

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load order");
        setOrder(data.order);
        setForm({
          shipping_cost: data.order.shipping_cost != null ? String(data.order.shipping_cost) : "",
          product_cost: String(data.order.product_cost),
          selling_price: String(data.order.selling_price),
          state: data.order.state ?? "",
          pincode: data.order.pincode ?? "",
          shipping_through: data.order.shipping_through ?? "",
          tracking_number: data.order.tracking_number ?? "",
          packing_dimension: data.order.packing_dimension ?? "",
          packing_weight: data.order.packing_weight ?? "",
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping_cost: form.shipping_cost === "" ? null : Number(form.shipping_cost),
          product_cost: Number(form.product_cost),
          selling_price: Number(form.selling_price),
          state: form.state,
          pincode: form.pincode,
          shipping_through: form.shipping_through,
          tracking_number: form.tracking_number,
          packing_dimension: form.packing_dimension,
          packing_weight: form.packing_weight,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (error && !order) return <p className="text-red-600">{error}</p>;
  if (!order) return null;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-1">Edit Order {order.order_no}</h1>
      <p className="text-sm text-gray-500 mb-6">{formatIst(order.date)} · {order.channel}</p>

      <form onSubmit={handleSave} className="bg-white border rounded-lg p-6 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product Cost (₹)</label>
            <input
              type="number"
              step="0.01"
              value={form.product_cost}
              onChange={(e) => setForm({ ...form, product_cost: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Selling Price (₹)</label>
            <input
              type="number"
              step="0.01"
              value={form.selling_price}
              onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Shipping Cost (₹)</label>
          <input
            type="number"
            step="0.01"
            value={form.shipping_cost}
            onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {EDITABLE_TEXT_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1">{f.label}</label>
              <input
                type="text"
                value={form[f.key as string] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          ))}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 text-sm rounded border hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
