import { useEffect, useMemo, useState } from "react";
import {
  buildGapTierOrder,
  formatDate,
  formatGapCompoundMonths,
  formatGapCompoundWeeks,
  nextTierAriaHint,
} from "@/lib/lifelogUtils";
import { hapticLight, touchPress } from "@/lib/touchFeedback";
import { cn } from "@/lib/utils";

/** Tap cycles through applicable units only: weeks if ≥7d, months if ≥30d. */
export default function LifeLogGapPill({
  gapDays,
  newerDateStr,
  olderDateStr,
  isDarkMode,
  kind = "completions",
}) {
  const tiers = useMemo(() => buildGapTierOrder(gapDays), [gapDays]);
  const [tierIdx, setTierIdx] = useState(0);

  useEffect(() => {
    setTierIdx(0);
  }, [gapDays]);

  const tier = tiers[Math.min(tierIdx, tiers.length - 1)];

  const pillBodyClass = `inline-block text-[10px] font-medium max-w-[min(100%,16rem)] px-2.5 py-0.5 rounded-full select-none text-center whitespace-nowrap leading-snug border ${
    isDarkMode
      ? "bg-iron-800 text-iron-400 border-iron-700/60"
      : "bg-slate-100 text-slate-500 border-slate-200"
  }`;

  const { text, ariaLabel, titleHint } = useMemo(() => {
    const base =
      kind === "logs"
        ? `${gapDays} day span between consecutive logs`
        : `${gapDays} day span between completed days`;
    const between =
      newerDateStr && olderDateStr
        ? ` From ${formatDate(newerDateStr)} to ${formatDate(olderDateStr)}.`
        : "";

    let display;
    if (tier === "d") display = `${gapDays}d gap`;
    else if (tier === "w") display = `${formatGapCompoundWeeks(gapDays)} gap`;
    else display = `${formatGapCompoundMonths(gapDays)} gap`;

    const hint = nextTierAriaHint(tiers, tierIdx);
    const titleHintVal =
      tiers.length < 2
        ? undefined
        : `Tap to switch: ${tiers.map(t => (t === "d" ? "days" : t === "w" ? "weeks" : "months")).join(" · ")}`;

    return {
      text: display,
      ariaLabel: `${display} ${gapDays} calendar days (${base}).${between}${hint}`,
      titleHint: titleHintVal,
    };
  }, [gapDays, newerDateStr, olderDateStr, kind, tier, tiers, tierIdx]);

  if (tiers.length < 2) {
    return (
      <span className={`${pillBodyClass} cursor-default`} aria-label={ariaLabel}>
        {text}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        hapticLight();
        setTierIdx(i => (i + 1) % tiers.length);
      }}
      aria-label={ariaLabel}
      title={titleHint}
      className={cn(
        pillBodyClass,
        touchPress,
        "cursor-pointer",
        isDarkMode
          ? "hover:border-iron-600/60 hover:text-iron-400 active:bg-iron-800"
          : "hover:border-slate-300 hover:text-slate-600 active:bg-slate-100",
      )}
    >
      {text}
    </button>
  );
}
