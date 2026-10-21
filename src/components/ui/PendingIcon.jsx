import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Swaps a Lucide icon for a spinner while an async action runs (buttons, icon actions).
 */
export default function PendingIcon({
  pending = false,
  className,
  iconClassName = "h-4 w-4",
  children,
}) {
  if (pending) {
    return (
      <Loader2
        className={cn("animate-spin shrink-0", iconClassName, className)}
        aria-hidden
      />
    );
  }
  return children;
}
