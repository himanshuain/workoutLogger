import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small discovery copy for Radix ContextMenu triggers (mobile long-press + desktop right-click). */
export default function LongPressContextHint({ variant = "editDelete", isDarkMode, className }) {
  const text =
    variant === "deleteOnly"
      ? "Hold or right-click to delete"
      : "Hold or right-click for edit or delete";

  return (
    <p
      role="note"
      className={cn(
        "mx-auto flex w-full flex-wrap items-center justify-center gap-1 px-2 text-[10px] font-medium leading-snug select-none",
        isDarkMode ? "text-iron-600" : "text-slate-400",
        className,
      )}
    >
      <Info
        className={cn("size-3.5 shrink-0 opacity-90", isDarkMode ? "text-iron-500" : "text-slate-400")}
        strokeWidth={2}
        aria-hidden
      />
      <span>{text}</span>
    </p>
  );
}
