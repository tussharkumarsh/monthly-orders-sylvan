"use client";

import { useMemo, useState } from "react";
import { useOrders } from "@/lib/use-orders";
import MonthPicker from "@/components/MonthPicker";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthlyViewPage() {
  const [month, setMonth] = useState(currentMonth());
  const { orders, loading, error } = useOrders(month, "");

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + o.selling_price, 0);
    const totalCost = orders.reduce((s, o) => s + o.product_cost, 0);
    const totalShipping = orders.reduce((s, o) => s + (o.shipping_cost ?? 0), 0);
    const totalProfit = orders.reduce((s, o) => s + o.profit, 0);

    const byChannel: Record<string, { count: number; profit: number }> = {};
    for (const o of orders) {
      byChannel[o.channel] ??= { count: 0, profit: 0 };
      byChannel[o.channel].count++;
      byChannel[o.channel].profit += o.profit;
    }

    return { totalOrders, totalRevenue, totalCost, totalShipping, totalProfit, byChannel };
  }, [orders]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Monthly Analytics</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Orders" value={String(stats.totalOrders)} />
            <StatCard label="Revenue" value={`₹${stats.totalRevenue.toFixed(2)}`} />
            <StatCard label="Product Cost" value={`₹${stats.totalCost.toFixed(2)}`} />
            <StatCard label="Shipping Cost" value={`₹${stats.totalShipping.toFixed(2)}`} />
            <StatCard
              label="Profit"
              value={`₹${stats.totalProfit.toFixed(2)}`}
              positive={stats.totalProfit >= 0}
            />
          </div>

          <div className="bg-white border rounded-lg p-6">
            <h2 className="font-semibold mb-4">By Channel</h2>
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-left">
                <tr>
                  <th className="py-2">Channel</th>
                  <th className="py-2 text-right">Orders</th>
                  <th className="py-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.byChannel).map(([channel, s]) => (
                  <tr key={channel} className="border-t">
                    <td className="py-2">{channel}</td>
                    <td className="py-2 text-right">{s.count}</td>
                    <td
                      className={`py-2 text-right font-medium ${
                        s.profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ₹{s.profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {Object.keys(stats.byChannel).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-500">
                      No orders this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`text-xl font-semibold ${
          positive === undefined ? "" : positive ? "text-green-600" : "text-red-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
