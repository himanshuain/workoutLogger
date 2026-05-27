import { cn } from "@/lib/utils";

/** Shared page width wrapper — full width on mobile, wider centered column on desktop. */
export function PageContainer({ children, className }) {
  return (
    <div
      className={cn(
        "w-full px-4 lg:max-w-5xl lg:mx-auto lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
