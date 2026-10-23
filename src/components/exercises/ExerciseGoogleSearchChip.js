import GoogleGIcon from "@/components/icons/GoogleGIcon";
import { googleImagesSearchUrl } from "@/lib/exerciseMedia";
import { cn } from "@/lib/utils";

export function exerciseGoogleChipClass(isDarkMode) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
    isDarkMode
      ? "border border-white/10 bg-white/[0.06] text-iron-100 active:bg-white/10"
      : "border border-slate-200/90 bg-white text-slate-800 shadow-sm active:bg-slate-50",
  );
}

export default function ExerciseGoogleSearchChip({ name, isDarkMode, className }) {
  const displayName = name || "Exercise";
  const googleHref = googleImagesSearchUrl(displayName);
  if (!googleHref) return null;

  return (
    <a
      href={googleHref}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(exerciseGoogleChipClass(isDarkMode), className)}
      aria-label={`Search SmartWorkout images for ${displayName}`}
      title="SmartWorkout on Google Images"
      onClick={e => e.stopPropagation()}
    >
      <GoogleGIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>Search</span>
    </a>
  );
}
