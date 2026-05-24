import Image from "next/image";
import {
  exerciseImageUnoptimized,
  googleImagesSearchUrl,
} from "@/lib/exerciseMedia";
import GoogleGIcon from "@/components/icons/GoogleGIcon";

/**
 * Planner row thumbnail: catalog image, or a tappable Google Images shortcut.
 */
export default function RoutineExerciseThumb({ exerciseName, thumbUrl, isDarkMode }) {
  if (thumbUrl) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-card bg-iron-800">
        <Image
          src={thumbUrl}
          alt=""
          fill
          className="object-cover"
          sizes="48px"
          unoptimized={exerciseImageUnoptimized(thumbUrl)}
        />
      </div>
    );
  }

  const href = googleImagesSearchUrl(exerciseName || "");
  const label =
    href && exerciseName?.trim()
      ? `Search Google Images for ${exerciseName.trim()}`
      : "Search Google Images";

  return (
    <a
      href={href || undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => {
        if (!href) e.preventDefault();
      }}
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-card ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        isDarkMode
          ? "bg-iron-800 ring-white/10 hover:bg-iron-700 focus-visible:ring-lift-primary focus-visible:ring-offset-iron-950"
          : "bg-slate-100 ring-black/10 hover:bg-slate-200 focus-visible:ring-workout-primary focus-visible:ring-offset-white"
      } ${!href ? "pointer-events-none opacity-50" : ""}`}
      aria-label={label}
      title={label}
    >
      <GoogleGIcon className="h-7 w-7" />
    </a>
  );
}
