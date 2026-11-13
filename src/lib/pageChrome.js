import { cn } from "@/lib/utils";

/**
 * Sticky title row inside PageContainer — negative margins align with container padding.
 */
export function pageStickyHeaderClass(_isDarkMode, className) {
  return cn(
    "sticky top-0 z-30 -mx-4 px-4 pb-3 pt-1 backdrop-blur-sm lg:-mx-8 lg:px-8",
    "bg-surface-page/95",
    className,
  );
}

export function pageTitleClass(isDarkMode, className) {
  return cn(
    "text-xl font-bold",
    isDarkMode ? "text-iron-100" : "text-[color:var(--text-primary)]",
    className,
  );
}

export function pageSubtitleClass(isDarkMode, className) {
  return cn(
    "text-sm mt-0.5",
    isDarkMode ? "text-iron-500" : "text-[color:var(--text-muted)]",
    className,
  );
}

/** Optional layout-only classes for ModalContent (surface comes from ui/modal defaults). */
export function modalSheetLayoutClass(className) {
  return cn("flex min-h-0 flex-col overflow-hidden", className);
}
