import { cn } from "@/lib/utils";
import BikePendingList from "@/components/bike/BikePendingList";

export default function BikePendingSection({ items, isDarkMode, onAdd, onMarkDone, onRemove }) {
  return (
    <section
      className={cn(
        "mb-4 rounded-card border p-3 sm:p-3.5",
        isDarkMode ? "border-amber-500/25 bg-amber-500/5" : "border-amber-200 bg-amber-50/80",
      )}
      aria-label="Pending bike tasks"
    >
      <BikePendingList
        items={items}
        isDarkMode={isDarkMode}
        onAdd={onAdd}
        onUseItem={onMarkDone}
        onRemove={onRemove}
        useItemLabel="Done"
        compact
      />
    </section>
  );
}
