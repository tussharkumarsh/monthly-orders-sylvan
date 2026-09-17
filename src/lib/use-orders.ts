"use client";

import { useCallback, useEffect, useState } from "react";
import type { Order } from "@/types/order";

export function useOrders(month: string, search: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (month) params.set("month", month);
      if (search) params.set("search", search);
      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load orders");
      setOrders(data.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [month, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch is the data-fetching entry point
    void refetch();
  }, [refetch]);

  return { orders, loading, error, refetch };
}
