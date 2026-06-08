import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AddMealZone({ isDarkMode, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex flex-col items-center justify-center gap-2 py-8 rounded-card border-2 border-dashed transition-colors",
        isDarkMode
          ? "border-iron-700 text-iron-500 hover:border-lift-primary/40 hover:text-lift-primary hover:bg-iron-900/40"
          : "border-slate-300 text-slate-400 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/30",
      )}
    >
      <Plus className="w-6 h-6" />
      <span className="text-xs font-medium">Click to add a new meal</span>
    </button>
  );
}
