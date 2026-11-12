import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  readBikePendingItems,
  clearBikePendingLocalStorage,
} from "@/lib/bikePendingStorage";

export function useBikePending(user) {
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPending = useCallback(async () => {
    if (!user?.id) {
      setPendingItems([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bike_pending_items")
        .select("id, title, notes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error) {
        setPendingItems(
          (data || []).map(row => ({
            id: row.id,
            title: row.title,
            notes: row.notes || "",
            createdAt: row.created_at,
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const migrateLocalPendingIfNeeded = useCallback(async () => {
    if (!user?.id || typeof window === "undefined") return;
    const local = readBikePendingItems();
    if (local.length === 0) return;

    const rows = local.map(item => ({
      user_id: user.id,
      title: item.title,
      notes: item.notes || null,
      created_at: item.createdAt || new Date().toISOString(),
    }));

    const { error } = await supabase.from("bike_pending_items").insert(rows);
    if (!error) clearBikePendingLocalStorage();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setPendingItems([]);
      return;
    }
    void (async () => {
      await migrateLocalPendingIfNeeded();
      await loadPending();
    })();
  }, [user?.id, loadPending, migrateLocalPendingIfNeeded]);

  const addPendingItem = useCallback(
    async ({ title, notes = "" }) => {
      if (!user?.id) return null;
      const t = String(title || "").trim();
      if (!t) return null;

      const { data, error } = await supabase
        .from("bike_pending_items")
        .insert({
          user_id: user.id,
          title: t,
          notes: String(notes || "").trim() || null,
        })
        .select("id, title, notes, created_at")
        .single();

      if (error || !data) return null;

      const item = {
        id: data.id,
        title: data.title,
        notes: data.notes || "",
        createdAt: data.created_at,
      };
      setPendingItems(prev => [item, ...prev]);
      return item;
    },
    [user?.id],
  );

  const removePendingItem = useCallback(
    async id => {
      if (!user?.id || !id) return false;
      setPendingItems(prev => prev.filter(p => p.id !== id));
      const { error } = await supabase.from("bike_pending_items").delete().eq("id", id).eq("user_id", user.id);
      if (error) {
        await loadPending();
        return false;
      }
      return true;
    },
    [user?.id, loadPending],
  );

  return {
    pendingItems,
    pendingLoading: loading,
    loadPending,
    addPendingItem,
    removePendingItem,
  };
}
