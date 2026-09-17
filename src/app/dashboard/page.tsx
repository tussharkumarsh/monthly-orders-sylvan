"use client";

import { useMemo, useState } from "react";
import { useOrders } from "@/lib/use-orders";
import MonthPicker from "@/components/MonthPicker";
import OrdersTable from "@/components/OrdersTable";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const [search, setSearch] = useState("");
  const { orders, loading, error, refetch } = useOrders(month, search);

  const totalProfit = useMemo(
    () => orders.reduce((sum, o) => sum + o.profit, 0),
    [orders]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          <input
            type="text"
            placeholder="Search Order No…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
          <a
            href={`/api/orders/export?month=${month}`}
            className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700"
          >
            Export Excel
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-2xl font-semibold">{orders.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total Profit</p>
          <p className={`text-2xl font-semibold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            ₹{totalProfit.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Month</p>
          <p className="text-2xl font-semibold">{month}</p>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading orders…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && <OrdersTable orders={orders} onChanged={refetch} />}
    </div>
  );
}
