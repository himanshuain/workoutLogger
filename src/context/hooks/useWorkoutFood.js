import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeFoodQuantity } from "@/lib/foodQuantity";

/** Food catalog and daily entries extracted from WorkoutContext. */
export function useWorkoutFood(user, today, foodItems, setFoodItems, todayFoodEntries, setTodayFoodEntries, queryClient) {
  const loadFoodItems = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("food_items")
        .select("*")
        .eq("user_id", user.id)
        .order("order_index");

      if (!error && data) {
        setFoodItems(data);
      }
    } catch (err) {
      console.error("Error loading food items:", err);
    }
  }, [user, setFoodItems]);

  const loadTodayFoodEntries = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("food_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today);

      if (!error && data) {
        const entriesMap = {};
        for (const e of data) {
          entriesMap[e.food_item_id] = e;
        }
        setTodayFoodEntries(entriesMap);
      }
    } catch (err) {
      console.error("Error loading today food entries:", err);
    }
  }, [user, today, setTodayFoodEntries]);

  const createFoodItem = useCallback(
    async foodItem => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("food_items")
        .insert({
          user_id: user.id,
          ...foodItem,
          order_index: foodItems.length,
        })
        .select()
        .single();

      if (!error && data) {
        setFoodItems(prev => [...prev, data]);
        return data;
      }
      return null;
    },
    [user, foodItems, setFoodItems],
  );

  const updateFoodItem = useCallback(
    async (id, updates) => {
      if (!user) return;

      const { error } = await supabase.from("food_items").update(updates).eq("id", id);

      if (!error) {
        setFoodItems(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
      }
    },
    [user, setFoodItems],
  );

  const deleteFoodItem = useCallback(
    async id => {
      if (!user) return;

      const { error } = await supabase.from("food_items").delete().eq("id", id);

      if (!error) {
        setFoodItems(prev => prev.filter(f => f.id !== id));
      }
    },
    [user, setFoodItems],
  );

  const toggleFoodEntry = useCallback(
    async (foodItemId, secondArg = 1) => {
      if (!user) return;

      const opts =
        secondArg !== null && typeof secondArg === "object" && !Array.isArray(secondArg)
          ? { quantity: secondArg.quantity ?? 1, date: secondArg.date ?? today }
          : { quantity: Number(secondArg) || 1, date: today };

      const targetDate = opts.date;
      const forToday = targetDate === today;

      let existing = forToday ? todayFoodEntries[foodItemId] : null;
      if (!forToday) {
        const { data } = await supabase
          .from("food_entries")
          .select("*")
          .eq("user_id", user.id)
          .eq("food_item_id", foodItemId)
          .eq("date", targetDate)
          .maybeSingle();
        existing = data;
      }

      if (existing) {
        const { error } = await supabase.from("food_entries").delete().eq("id", existing.id);

        if (!error && forToday) {
          setTodayFoodEntries(prev => {
            const updated = { ...prev };
            delete updated[foodItemId];
            return updated;
          });
        }
      } else {
        const item = foodItems.find(f => f.id === foodItemId);
        const q = normalizeFoodQuantity(opts.quantity, item);
        const { data, error } = await supabase
          .from("food_entries")
          .insert({
            user_id: user.id,
            food_item_id: foodItemId,
            date: targetDate,
            quantity: q,
            is_completed: true,
          })
          .select()
          .single();

        if (!error && data && forToday) {
          setTodayFoodEntries(prev => ({
            ...prev,
            [foodItemId]: data,
          }));
        }
      }

      queryClient.invalidateQueries({ queryKey: ["foodEntries"] });
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    },
    [user, today, todayFoodEntries, setTodayFoodEntries, queryClient, foodItems],
  );

  const updateFoodEntryQuantity = useCallback(
    async (foodItemId, quantity, entryDate = today) => {
      if (!user) return;

      const item = foodItems.find(f => f.id === foodItemId);
      const q = normalizeFoodQuantity(quantity, item);
      const forToday = entryDate === today;

      let existing = forToday ? todayFoodEntries[foodItemId] : null;
      if (!forToday) {
        const { data } = await supabase
          .from("food_entries")
          .select("*")
          .eq("user_id", user.id)
          .eq("food_item_id", foodItemId)
          .eq("date", entryDate)
          .maybeSingle();
        existing = data;
      }

      if (existing) {
        const { error } = await supabase
          .from("food_entries")
          .update({ quantity: q })
          .eq("id", existing.id);

        if (!error && forToday) {
          setTodayFoodEntries(prev => ({
            ...prev,
            [foodItemId]: { ...existing, quantity: q },
          }));
        }
      } else {
        const { data, error } = await supabase
          .from("food_entries")
          .insert({
            user_id: user.id,
            food_item_id: foodItemId,
            date: entryDate,
            quantity: q,
            is_completed: true,
          })
          .select()
          .single();

        if (!error && data && forToday) {
          setTodayFoodEntries(prev => ({
            ...prev,
            [foodItemId]: data,
          }));
        }
      }

      queryClient.invalidateQueries({ queryKey: ["foodEntries"] });
      queryClient.invalidateQueries({ queryKey: ["foodHistory"] });
    },
    [user, today, todayFoodEntries, setTodayFoodEntries, queryClient, foodItems],
  );

  const getFoodEntries = useCallback(
    async (startDate, endDate) => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("food_entries")
        .select("*, food_items(name, icon, color)")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) {
        console.error("Error getting food entries:", error);
        return [];
      }

      return data || [];
    },
    [user],
  );

  return {
    loadFoodItems,
    loadTodayFoodEntries,
    createFoodItem,
    updateFoodItem,
    deleteFoodItem,
    toggleFoodEntry,
    updateFoodEntryQuantity,
    getFoodEntries,
  };
}
