import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import { useWorkout } from "@/context/WorkoutContext";
import Layout from "@/components/Layout";
import { PageContainer } from "@/components/layout/PageContainer";
import { FadeIn } from "@/components/ui/fade-in";
import MacroStatCards from "@/components/macros/MacroStatCards";
import MealPlanCard from "@/components/macros/MealPlanCard";
import FoodPickerModal from "@/components/macros/FoodPickerModal";
import AddMealZone from "@/components/macros/AddMealZone";
import MacroTargetsEditor from "@/components/macros/MacroTargetsEditor";
import { getMacroTargets } from "@/lib/macroCalculations";
import {
  getMealPlan,
  sumPlan,
  mergePlanForLogging,
  newPlanItem,
  newMeal,
  nextMealName,
} from "@/lib/macroPlanner";
import { ClipboardCheck, Beef } from "lucide-react";
import { cn } from "@/lib/utils";
import { actionPrimary, actionSecondaryCompact } from "@/lib/actionButtonStyles";

export default function MacroPlannerPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const {
    user,
    today,
    foodItems,
    settings,
    updateSettings,
    updateFoodEntryQuantity,
    createFoodItem,
  } = useWorkout();

  const [mealList, setMealList] = useState(() => getMealPlan(settings).mealList);
  const [activeMealId, setActiveMealId] = useState(() => getMealPlan(settings).mealList[0]?.id);
  const [pickerMealId, setPickerMealId] = useState(null);
  const [saving, setSaving] = useState(false);

  const targets = getMacroTargets(settings);
  const plan = useMemo(() => sumPlan(mealList, foodItems), [mealList, foodItems]);

  useEffect(() => {
    const loaded = getMealPlan(settings).mealList;
    setMealList(loaded);
    setActiveMealId(prev => (loaded.some(m => m.id === prev) ? prev : loaded[0]?.id));
  }, [settings?.macro_plans]);

  const persistPlan = useCallback(
    async nextList => {
      await updateSettings({ macro_plans: { mealList: nextList } });
    },
    [updateSettings],
  );

  const updateMealList = useCallback(
    async updater => {
      const next = typeof updater === "function" ? updater(mealList) : updater;
      setMealList(next);
      setSaving(true);
      try {
        await persistPlan(next);
      } catch {
        toast.error("Failed to save plan");
      } finally {
        setSaving(false);
      }
    },
    [mealList, persistPlan],
  );

  const handleSaveTargets = useCallback(
    async newTargets => {
      try {
        await updateSettings({ macro_targets: newTargets });
        toast.success("Targets updated");
      } catch {
        toast.error("Failed to save targets");
      }
    },
    [updateSettings],
  );

  const addFoodToMeal = (mealId, item) => {
    updateMealList(prev =>
      prev.map(meal =>
        meal.id === mealId
          ? { ...meal, items: [...meal.items, newPlanItem(item.id, item.default_quantity || 1)] }
          : meal,
      ),
    );
    toast.success(`Added ${item.name}`);
  };

  const handlePickFood = item => {
    if (!pickerMealId) return;
    addFoodToMeal(pickerMealId, item);
    setPickerMealId(null);
  };

  const handleAddMeal = () => {
    const meal = newMeal(nextMealName(mealList));
    updateMealList(prev => [...prev, meal]);
    setActiveMealId(meal.id);
  };

  const handleDeleteMeal = mealId => {
    if (mealList.length <= 1) {
      toast.error("Keep at least one meal");
      return;
    }
    updateMealList(prev => prev.filter(m => m.id !== mealId));
    if (activeMealId === mealId) {
      setActiveMealId(mealList.find(m => m.id !== mealId)?.id);
    }
  };

  const handleRenameMeal = (mealId, name) => {
    updateMealList(prev => prev.map(m => (m.id === mealId ? { ...m, name } : m)));
  };

  const handleRemoveItem = (mealId, rowId) => {
    updateMealList(prev =>
      prev.map(meal =>
        meal.id === mealId
          ? { ...meal, items: meal.items.filter(row => row.id !== rowId) }
          : meal,
      ),
    );
  };

  const handleQuantity = (mealId, rowId, quantity) => {
    updateMealList(prev =>
      prev.map(meal =>
        meal.id === mealId
          ? { ...meal, items: meal.items.map(row => (row.id === rowId ? { ...row, quantity } : row)) }
          : meal,
      ),
    );
  };

  const handleLogPlan = async () => {
    const merged = mergePlanForLogging(mealList);
    const ids = Object.keys(merged);
    if (!ids.length) {
      toast.error("Add foods to your plan first");
      return;
    }
    try {
      for (const foodItemId of ids) {
        await updateFoodEntryQuantity(foodItemId, merged[foodItemId], today);
      }
      toast.success("Plan logged to today's food tracker");
    } catch {
      toast.error("Failed to log plan");
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <p className={isDarkMode ? "text-iron-500" : "text-slate-500"}>Sign in to plan macros</p>
          <button
            onClick={() => router.push("/auth")}
            className={`mt-4 px-6 py-2.5 rounded-card font-bold ${
              isDarkMode ? "bg-lift-primary text-iron-950" : "bg-workout-primary text-white"
            }`}
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <FadeIn duration={0.4}>
        <PageContainer className="py-4 lg:max-w-6xl">
          <div className="mb-4 space-y-3">
            <div className="min-w-0">
              <h2 className={cn("text-xl font-bold", isDarkMode ? "text-iron-100" : "text-slate-800")}>
                My Plan
              </h2>
              <p className={cn("text-sm mt-0.5", isDarkMode ? "text-iron-500" : "text-slate-500")}>
                {saving ? "Saving…" : "Build meals · log when ready"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MacroTargetsEditor targets={targets} onSave={handleSaveTargets} isDarkMode={isDarkMode} />
              <button
                type="button"
                onClick={handleLogPlan}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-card px-3 py-2 text-xs font-semibold",
                  actionPrimary(isDarkMode),
                )}
              >
                <ClipboardCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                Log to tracker
              </button>
              <Link
                href="/dashboard"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-card px-3 py-2 text-xs font-semibold",
                  actionSecondaryCompact(isDarkMode),
                )}
              >
                <Beef className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.25} />
                Tracker
              </Link>
            </div>
          </div>

          <div className="space-y-4 pb-6">
            <MacroStatCards totals={plan.totals} targets={targets} isDarkMode={isDarkMode} />

            <div className="space-y-3">
              {mealList.map(meal => {
                const mealData = plan.byMeal[meal.id];
                return (
                  <MealPlanCard
                    key={meal.id}
                    meal={meal}
                    rows={mealData?.rows || []}
                    totals={mealData?.totals || { protein_g: 0, carbs_g: 0, fat_g: 0, calories: 0 }}
                    isDarkMode={isDarkMode}
                    isActive={activeMealId === meal.id}
                    canDelete={mealList.length > 1}
                    onSelect={() => setActiveMealId(meal.id)}
                    onRename={name => handleRenameMeal(meal.id, name)}
                    onDelete={() => handleDeleteMeal(meal.id)}
                    onAddFood={() => {
                      setActiveMealId(meal.id);
                      setPickerMealId(meal.id);
                    }}
                    onRemove={rowId => handleRemoveItem(meal.id, rowId)}
                    onQuantityChange={(rowId, q) => handleQuantity(meal.id, rowId, q)}
                  />
                );
              })}
              <AddMealZone isDarkMode={isDarkMode} onClick={handleAddMeal} />
            </div>
          </div>
        </PageContainer>
      </FadeIn>

      <FoodPickerModal
        open={!!pickerMealId}
        onClose={() => setPickerMealId(null)}
        foodItems={foodItems}
        isDarkMode={isDarkMode}
        onPick={handlePickFood}
        onCreateFood={createFoodItem}
        mealName={mealList.find(m => m.id === pickerMealId)?.name}
        title="Add food"
      />

    </Layout>
  );
}
