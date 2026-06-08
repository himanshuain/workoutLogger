import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardGuide({ isDarkMode }) {
  return (
    <div
      className={cn(
        "rounded-card border p-3.5",
        isDarkMode ? "bg-iron-900/50 border-iron-800" : "bg-white border-slate-200 shadow-sm",
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className={cn("w-4 h-4", isDarkMode ? "text-lift-primary" : "text-workout-primary")} />
        <p className={cn("text-sm font-semibold", isDarkMode ? "text-iron-100" : "text-slate-800")}>
          How to read this page
        </p>
      </div>
      <p className={cn("text-[11px] leading-relaxed mb-2", isDarkMode ? "text-iron-400" : "text-slate-600")}>
        Scroll down for charts. Each one has a short guide underneath — <strong>What this shows</strong>,{" "}
        <strong>How to use it</strong>, and <strong>Your numbers</strong>. Tap or hover a point for that day/week.
      </p>
      <ul className={cn("text-[11px] leading-relaxed space-y-1.5", isDarkMode ? "text-iron-500" : "text-slate-500")}>
        <li><span className="font-medium text-inherit">Top cards</span> — today&apos;s snapshot (streak, workouts, habits, protein)</li>
        <li><span className="font-medium text-inherit">Line & bar charts</span> — trends over weeks (are you improving?)</li>
        <li><span className="font-medium text-inherit">Donut chart</span> — which muscle groups you train most</li>
        <li><span className="font-medium text-inherit">Heatmaps at bottom</span> — calendar view of which days you showed up</li>
      </ul>
    </div>
  );
}
