import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Dim a region and show a centered spinner while async work runs (images, cards, panels). */
export default function PendingPlaceOverlay({
  pending = false,
  className,
  spinnerClassName = "h-8 w-8",
}) {
  if (!pending) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[25] flex items-center justify-center bg-black/50",
        className,
      )}
      aria-hidden
    >
      <Loader2 className={cn("animate-spin text-white", spinnerClassName)} />
    </div>
  );
}
