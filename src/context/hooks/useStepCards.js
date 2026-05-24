import { useCallback } from "react";
import { supabase } from "@/lib/supabase";

/** Step cards / checklists extracted from WorkoutContext. */
export function useStepCards(user, stepCards, setStepCards) {
  const loadStepCards = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("step_cards")
        .select(`
          *,
          step_items (
            id,
            text,
            order_index,
            created_at
          )
        `)
        .eq("user_id", user.id)
        .order("order_index");

      if (!error && data) {
        const processed = data.map(card => ({
          ...card,
          step_items: (card.step_items || []).sort((a, b) => a.order_index - b.order_index),
        }));
        setStepCards(processed);
      }
    } catch (err) {
      console.error("Error loading step cards:", err);
    }
  }, [user, setStepCards]);

  const createStepCard = useCallback(
    async card => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("step_cards")
        .insert({
          user_id: user.id,
          name: card.name,
          icon: card.icon || "📋",
          color: card.color || "#3b82f6",
          order_index: stepCards.length,
        })
        .select()
        .single();

      if (!error && data) {
        setStepCards(prev => [...prev, { ...data, step_items: [] }]);
        return data;
      }
      return null;
    },
    [user, stepCards.length, setStepCards],
  );

  const updateStepCard = useCallback(
    async (id, updates) => {
      if (!user) return;
      const { error } = await supabase
        .from("step_cards")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (!error) {
        setStepCards(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
      }
    },
    [user, setStepCards],
  );

  const deleteStepCard = useCallback(
    async id => {
      if (!user) return;
      const { error } = await supabase.from("step_cards").delete().eq("id", id);
      if (!error) {
        setStepCards(prev => prev.filter(c => c.id !== id));
      }
    },
    [user, setStepCards],
  );

  const createStepItem = useCallback(
    async (cardId, text) => {
      if (!user) return null;
      const card = stepCards.find(c => c.id === cardId);
      const orderIndex = card ? (card.step_items || []).length : 0;

      const { data, error } = await supabase
        .from("step_items")
        .insert({
          card_id: cardId,
          user_id: user.id,
          text,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (!error && data) {
        setStepCards(prev =>
          prev.map(c =>
            c.id === cardId ? { ...c, step_items: [...(c.step_items || []), data] } : c,
          ),
        );
        return data;
      }
      return null;
    },
    [user, stepCards, setStepCards],
  );

  const batchCreateStepItems = useCallback(
    async (cardId, texts) => {
      if (!user || !texts.length) return [];

      const { data, error } = await supabase
        .from("step_items")
        .insert(
          texts.map((text, i) => ({
            card_id: cardId,
            user_id: user.id,
            text,
            order_index: i,
          })),
        )
        .select();

      if (!error && data) {
        setStepCards(prev =>
          prev.map(c =>
            c.id === cardId ? { ...c, step_items: [...(c.step_items || []), ...data] } : c,
          ),
        );
        return data;
      }
      return [];
    },
    [user, setStepCards],
  );

  const updateStepItem = useCallback(
    async (itemId, cardId, updates) => {
      if (!user) return;
      const { error } = await supabase.from("step_items").update(updates).eq("id", itemId);

      if (!error) {
        setStepCards(prev =>
          prev.map(c =>
            c.id === cardId
              ? {
                  ...c,
                  step_items: (c.step_items || []).map(item =>
                    item.id === itemId ? { ...item, ...updates } : item,
                  ),
                }
              : c,
          ),
        );
      }
    },
    [user, setStepCards],
  );

  const deleteStepItem = useCallback(
    async (itemId, cardId) => {
      if (!user) return;
      const { error } = await supabase.from("step_items").delete().eq("id", itemId);
      if (!error) {
        setStepCards(prev =>
          prev.map(c =>
            c.id === cardId
              ? { ...c, step_items: (c.step_items || []).filter(item => item.id !== itemId) }
              : c,
          ),
        );
      }
    },
    [user, setStepCards],
  );

  const reorderStepItems = useCallback(
    async (cardId, reorderedItems) => {
      if (!user) return;
      setStepCards(prev =>
        prev.map(c => (c.id === cardId ? { ...c, step_items: reorderedItems } : c)),
      );
      await supabase.from("step_items").upsert(
        reorderedItems.map((item, i) => ({
          id: item.id,
          card_id: cardId,
          user_id: user.id,
          text: item.text,
          order_index: i,
        })),
      );
    },
    [user, setStepCards],
  );

  return {
    loadStepCards,
    createStepCard,
    updateStepCard,
    deleteStepCard,
    createStepItem,
    batchCreateStepItems,
    updateStepItem,
    deleteStepItem,
    reorderStepItems,
  };
}
