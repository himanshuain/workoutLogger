import { actionAccentSoft } from "@/lib/actionButtonStyles";
import { hapticLight, touchPress } from "@/lib/touchFeedback";
import { cn } from "@/lib/utils";

const NO_WEIGHT_OPTIONS = [
  { id: "barbell", label: "Barbell" },
  { id: "bodyweight", label: "Body weight" },
];

const pillRowScrollClass =
  "flex flex-nowrap gap-2 overflow-x-auto pb-1 -mx-1 px-1 overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

function modePillClass(isDarkMode, selected, dense = false) {
  return cn(
    "shrink-0 rounded-pill",
    touchPress,
    dense
      ? "min-h-[28px] px-2.5 text-[11px] font-medium leading-tight"
      : "min-h-[44px] px-4 text-sm font-semibold",
    selected
      ? isDarkMode
        ? cn(
            "bg-lift-primary text-iron-950",
            dense ? "shadow-sm shadow-lift-primary/20" : "shadow-lg shadow-lift-primary/25",
          )
        : actionAccentSoft(false)
      : isDarkMode
        ? "bg-iron-800/90 text-iron-200 border border-iron-700/80"
        : "bg-white text-[color:var(--text-secondary)] border border-surface-subtle shadow-sm active:bg-surface-pressed",
  );
}

function halfWeightPillClass(isDarkMode, disabled, dense = false) {
  return cn(
    modePillClass(isDarkMode, false, dense),
    disabled &&
      (isDarkMode
        ? "cursor-not-allowed opacity-45 shadow-none active:bg-iron-800/90"
        : "cursor-not-allowed opacity-45 shadow-none active:bg-white"),
  );
}

export function DualPulleyPill({
  selected = false,
  disabled = false,
  onToggle,
  isDarkMode,
  className,
  dense = false,
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        if (disabled) return;
        hapticLight();
        onToggle();
      }}
      disabled={disabled}
      className={cn(
        disabled
          ? halfWeightPillClass(isDarkMode, true, dense)
          : modePillClass(isDarkMode, selected, dense),
        className,
      )}
      aria-label="Dual pulley — log half the selected stack weight"
    >
      Dual pulley
    </button>
  );
}

/** Barbell and body weight mode pills. */
export default function ExerciseLogModePillRow({ value, onChange, isDarkMode, dense = false }) {
  return (
    <div
      className={cn(pillRowScrollClass, dense && "gap-1")}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {NO_WEIGHT_OPTIONS.map(({ id, label }) => {
        const selected = value != null && value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              hapticLight();
              onChange(id);
            }}
            className={modePillClass(isDarkMode, selected, dense)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
