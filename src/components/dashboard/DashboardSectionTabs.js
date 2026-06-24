import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function DashboardSectionTabs({
  isDarkMode,
  value,
  onValueChange,
  tabs,
  className,
  equalWidth = false,
}) {
  const visible = tabs.filter(tab => !tab.hidden);
  if (visible.length === 0) return null;

  const gridColsClass =
    {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
    }[visible.length] ?? "grid-cols-3";

  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn("w-full", className)}>
      <div
        className={cn(
          equalWidth ? "w-full pb-1" : "-mx-1 overflow-x-auto overscroll-x-contain scrollbar-thin px-1 pb-1",
          !equalWidth && isDarkMode ? "scrollbar-thumb-iron-700" : "",
        )}
      >
        <TabsList
          className={cn(
            "h-auto rounded-card p-1",
            equalWidth
              ? cn("grid w-full gap-1", gridColsClass)
              : "inline-flex w-max min-w-full max-w-none justify-start gap-1",
            isDarkMode ? "bg-iron-900/90 text-iron-400" : "bg-slate-100 text-slate-500",
          )}
        >
          {visible.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "group gap-1.5 py-2.5 text-xs font-semibold sm:text-sm",
                  equalWidth ? "w-full min-w-0 justify-center px-2" : "shrink-0 px-3",
                  "data-[state=active]:shadow-sm",
                  isDarkMode &&
                    "data-[state=inactive]:text-iron-400 data-[state=active]:bg-lift-primary data-[state=active]:text-iron-950",
                )}
              >
                {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                <span>{tab.label}</span>
                {tab.badge != null ? (
                  <span
                    className={cn(
                      "inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums leading-none",
                      isDarkMode
                        ? "bg-iron-700/90 text-iron-100 group-data-[state=active]:bg-iron-950/15 group-data-[state=active]:text-iron-950"
                        : "bg-slate-200/90 text-slate-600 group-data-[state=active]:bg-white/95 group-data-[state=active]:text-slate-800",
                    )}
                    aria-label={`${tab.badge} items`}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {visible.map(tab => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className="mt-4 space-y-4 pb-6 focus-visible:outline-none"
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
