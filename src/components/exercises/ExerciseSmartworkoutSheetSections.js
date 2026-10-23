import ExerciseGoogleSearchChip from "@/components/exercises/ExerciseGoogleSearchChip";
import { cn } from "@/lib/utils";

export function ExerciseSmartworkoutMarketingHeader({ isDarkMode }) {
  return (
    <div className="space-y-1.5 pt-1">
      <h2
        className={cn(
          "text-[22px] font-bold leading-tight tracking-tight",
          isDarkMode ? "text-white" : "text-slate-900",
        )}
      >
        Learn every{" "}
        <span className={isDarkMode ? "text-[#ff6b5a]" : "text-workout-primary"}>exercise</span>
      </h2>
      <p className={cn("text-sm", isDarkMode ? "text-iron-400" : "text-slate-500")}>
        Professional animations, instructions, and active muscles.
      </p>
    </div>
  );
}

export function ExerciseSmartworkoutInfoCard({
  name,
  primaryMuscle,
  stabilizingMuscles,
  isDarkMode,
  className,
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl px-3.5 py-3",
        isDarkMode ? "bg-iron-900/90 ring-1 ring-white/8" : "bg-slate-100 ring-1 ring-slate-200/90",
        className,
      )}
    >
      <p
        className={cn(
          "text-lg font-bold leading-snug",
          isDarkMode ? "text-white" : "text-slate-900",
        )}
      >
        <span className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1.5 pr-10">
          <span className="min-w-0">{name}</span>
          <ExerciseGoogleSearchChip name={name} isDarkMode={isDarkMode} />
        </span>
      </p>
      <div className="mt-3 space-y-2.5">
        <div>
          <p
            className={cn(
              "text-[11px] font-medium",
              isDarkMode ? "text-iron-500" : "text-slate-500",
            )}
          >
            Primary Muscle
          </p>
          <p
            className={cn(
              "text-sm font-semibold",
              isDarkMode ? "text-iron-100" : "text-slate-800",
            )}
          >
            {primaryMuscle || "—"}
          </p>
        </div>
        {stabilizingMuscles ? (
          <div>
            <p
              className={cn(
                "text-[11px] font-medium",
                isDarkMode ? "text-iron-500" : "text-slate-500",
              )}
            >
              Stabilizing/Assisting Muscles
            </p>
            <p className={cn("text-sm", isDarkMode ? "text-iron-200" : "text-slate-700")}>
              {stabilizingMuscles}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ExerciseSmartworkoutHowToPerform({ steps, isDarkMode, loading }) {
  if (loading) {
    return (
      <p className={cn("text-sm py-2", isDarkMode ? "text-iron-500" : "text-slate-500")}>
        Loading instructions…
      </p>
    );
  }
  if (!steps?.length) return null;

  return (
    <section className="space-y-3">
      <h3
        className={cn(
          "text-base font-bold",
          isDarkMode ? "text-white" : "text-slate-900",
        )}
      >
        How to perform
      </h3>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                isDarkMode
                  ? "bg-white text-iron-950"
                  : "bg-slate-900 text-white",
              )}
              aria-hidden
            >
              {i + 1}
            </span>
            <p
              className={cn(
                "min-w-0 flex-1 pt-0.5 text-sm leading-relaxed",
                isDarkMode ? "text-iron-300" : "text-slate-600",
              )}
            >
              {step}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ExerciseSmartworkoutDescription({ text, isDarkMode }) {
  if (!text?.trim()) return null;
  return (
    <section className="space-y-2">
      <h3
        className={cn(
          "text-base font-bold",
          isDarkMode ? "text-white" : "text-slate-900",
        )}
      >
        Description
      </h3>
      <p className={cn("text-sm leading-relaxed", isDarkMode ? "text-iron-400" : "text-slate-600")}>
        {text}
      </p>
    </section>
  );
}
