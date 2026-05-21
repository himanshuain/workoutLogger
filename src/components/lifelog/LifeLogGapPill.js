import { useEffect, useMemo, useState } from "react";
import {
  buildGapTierOrder,
  formatDate,
  formatGapCompoundMonths,
  formatGapCompoundWeeks,
  nextTierAriaHint,
} from "@/lib/lifelogUtils";

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

  const pillBodyClass = `text-[9px] font-medium max-w-[min(100%,16rem)] px-2 py-px rounded-full select-none text-center whitespace-normal leading-tight border ${
    isDarkMode
      ? "bg-iron-800/80 text-iron-600 border-iron-700/50"
      : "bg-slate-100 text-slate-400 border-slate-200"
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
      onClick={() => setTierIdx(i => (i + 1) % tiers.length)}
      aria-label={ariaLabel}
      title={titleHint}
      className={`${pillBodyClass} cursor-pointer transition-colors active:scale-95 touch-manipulation ${
        isDarkMode
          ? "active:bg-iron-800 hover:text-iron-400 hover:border-iron-600/60"
          : "active:bg-slate-100 hover:text-slate-600 hover:border-slate-300"
      }`}
    >
      {text}
    </button>
  );
}
