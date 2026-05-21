import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { surfaceSection, surfaceSelected } from "@/lib/surfaceStyles";
import { segmentSelected, segmentUnselected } from "@/lib/actionButtonStyles";
import { touchPress, touchPressCard } from "@/lib/touchFeedback";
import SectionHeader from "@/components/SectionHeader";

/** Outer chart card — matches SectionSurface elevation. */
export function chartSectionClass(isDarkMode, className) {
  return surfaceSection(isDarkMode, cn("overflow-hidden", className));
}

/** Nested stat tile / icon well inside charts. */
export function chartPanelInnerClass(isDarkMode, className) {
  return cn(
    "rounded-card",
    isDarkMode
      ? "border border-surface-subtle bg-surface-interactive"
      : "chart-panel-inner",
    className,
  );
}

export function ChartSection({ isDarkMode, className, children }) {
  return <div className={chartSectionClass(isDarkMode, className)}>{children}</div>;
}

export function ChartSectionHeader({ icon, label, meta, isDarkMode, className, children }) {
  return (
    <div className={cn("px-3 pt-3 pb-2", className)}>
      <SectionHeader icon={icon} label={label} meta={meta} isDarkMode={isDarkMode} className="mb-0">
        {children}
      </SectionHeader>
    </div>
  );
}

export function ChartCollapsibleHeader({
  isDarkMode,
  icon,
  leading,
  label,
  meta,
  expanded,
  onToggle,
  trailing,
  className,
}) {
  const Chevron = expanded ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        touchPressCard,
        "flex w-full items-center justify-between gap-2 px-3 pt-3 pb-2 text-left",
        isDarkMode ? "hover:bg-surface-interactive/60" : "hover:bg-surface-interactive/80",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {leading}
        <SectionHeader
          icon={icon}
          label={label}
          meta={meta}
          isDarkMode={isDarkMode}
          className="mb-0 min-w-0 flex-1"
        />
        {trailing}
      </div>
      <Chevron
        className={cn(
          "h-4 w-4 shrink-0",
          isDarkMode ? "text-iron-500" : "text-[color:var(--text-muted)]",
        )}
        aria-hidden
      />
    </button>
  );
}

export function ChartBody({ isDarkMode, bordered = true, className, children }) {
  return (
    <div
      className={cn(
        "px-3 pb-3",
        bordered && "border-t border-surface-subtle",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Compact legend row — tight spacing, metadata typography. */
export function ChartLegend({ isDarkMode, className, children }) {
  return (
    <div
      className={cn(
        "chart-legend flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-surface-subtle",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ChartLegendItem({ swatch, label }) {
  return (
    <div className="flex items-center gap-1.5">
      {swatch}
      <span className="text-metadata">{label}</span>
    </div>
  );
}

export function ChartSegmentTrack({ isDarkMode, className, children }) {
  return (
    <div
      className={cn(
        "inline-flex rounded-pill p-0.5",
        isDarkMode
          ? "bg-surface-interactive ring-1 ring-surface-subtle"
          : "border border-surface-subtle bg-surface-interactive",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ChartSegmentButton({ isDarkMode, selected, className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-pill px-2.5 py-1 text-[10px] font-semibold transition-colors",
        selected ? segmentSelected(isDarkMode) : segmentUnselected(isDarkMode),
        !selected && (isDarkMode ? "hover:text-iron-300" : "hover:text-[color:var(--text-primary)]"),
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Highlight for selected column / row in chart tables. */
export function chartSelectedColumnClass(isDarkMode) {
  return surfaceSelected(isDarkMode, "ring-0");
}
