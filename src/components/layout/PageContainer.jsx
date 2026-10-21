import { cn } from "@/lib/utils";

/** Narrow centered column on small screens; full width of parent from lg up. */
export const narrowMobileWideDesktopClass =
  "w-full max-w-lg mx-auto px-4 max-lg:max-w-lg lg:max-w-none lg:mx-0 lg:px-0";

/** Today / dashboard shell — comfortable padding, wide cap on very large monitors. */
export const homePageShellClass =
  "page-enter w-full max-w-[90rem] mx-auto px-4 py-4 sm:px-5 lg:px-8 xl:px-10";

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
