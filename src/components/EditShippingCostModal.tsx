"use client";

import { useState } from "react";
import type { Order } from "@/types/order";

interface Props {
  order: Order;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditShippingCostModal({ order, onClose, onSaved }: Props) {
  const [shippingCost, setShippingCost] = useState(
    order.shipping_cost != null ? String(order.shipping_cost) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping_cost: shippingCost === "" ? null : Number(shippingCost),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-1">Edit Shipping Cost</h2>
        <p className="text-sm text-gray-500 mb-4">Order {order.order_no}</p>

        <label className="block text-sm font-medium mb-1">Shipping Cost (₹)</label>
        <input
          type="number"
          step="0.01"
          value={shippingCost}
          onChange={(e) => setShippingCost(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-1"
          autoFocus
        />
        <p className="text-xs text-gray-500 mb-4">
          Profit = Selling Price − Product Cost − Shipping Cost
        </p>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
