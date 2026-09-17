"use client";

import { useState } from "react";
import Link from "next/link";
import type { Order } from "@/types/order";
import { formatIstDate } from "@/lib/date-utils";
import EditShippingCostModal from "./EditShippingCostModal";

interface Props {
  orders: Order[];
  onChanged: () => void;
}

export default function OrdersTable({ orders, onChanged }: Props) {
  const [editing, setEditing] = useState<Order | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(order: Order) {
    if (!confirm(`Delete order ${order.order_no}? This can be restored by support.`)) {
      return;
    }
    setDeletingId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
        No orders found for this view.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Order No</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Channel</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-right">Shipping Cost</th>
              <th className="px-4 py-3 text-right">Profit</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{order.order_no}</td>
                <td className="px-4 py-3">{formatIstDate(order.date)}</td>
                <td className="px-4 py-3">{order.channel}</td>
                <td className="px-4 py-3 max-w-xs truncate">{order.product_name}</td>
                <td className="px-4 py-3 text-right">
                  {order.shipping_cost != null ? `₹${order.shipping_cost.toFixed(2)}` : "—"}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    order.profit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ₹{order.profit.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setEditing(order)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <Link href={`/edit/${order.id}`} className="text-gray-600 hover:underline">
                      Details
                    </Link>
                    <button
                      onClick={() => handleDelete(order)}
                      disabled={deletingId === order.id}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === order.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditShippingCostModal
          order={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </>
  );
}
