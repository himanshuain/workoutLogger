import { useState, useEffect } from "react";
import Image from "next/image";
import ExerciseIcon from "@/components/ExerciseIcon";
import { cn } from "@/lib/utils";
import {
  exerciseMediaUrl,
  exerciseImageUnoptimized,
  googleImagesSearchUrl,
} from "@/lib/exerciseMedia";

/**
 * 56×56 list thumbnail from DB URLs. On error or missing URL, tappable Google Images link when the exercise has a name.
 */
export default function ExerciseListThumbnail({ exercise, isDarkMode }) {
  const url = exerciseMediaUrl(exercise);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [exercise?.id, url]);

  const bg = isDarkMode ? "bg-iron-800" : "bg-slate-100";
  const iconClass = isDarkMode ? "text-iron-500" : "text-slate-400";

  if (!url || failed) {
    const imagesUrl = googleImagesSearchUrl(exercise?.name ?? "");
    if (imagesUrl) {
      return (
        <a
          href={imagesUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className={cn(
            "relative flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-px rounded-xl px-0.5 outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-offset-2",
            isDarkMode
              ? `${bg} text-iron-300 ring-white/15 ring-offset-iron-900 focus-visible:ring-lift-primary`
              : `${bg} text-slate-500 ring-black/10 ring-offset-white focus-visible:ring-workout-primary`,
          )}
          aria-label={`Search Google Images for ${exercise?.name ?? "this exercise"}`}
        >
          <ExerciseIcon name={exercise?.name} className="h-8 w-8" color="currentColor" />
          <span
            className={cn(
              "text-[7px] font-bold uppercase leading-none tracking-tight",
              isDarkMode ? "text-lift-primary/95" : "text-workout-primary",
            )}
          >
            Photos
          </span>
        </a>
      );
    }
    return (
      <div
        className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex flex-col items-center justify-center gap-0.5 px-0.5 ${bg} ${iconClass}`}
      >
        <ExerciseIcon name={exercise?.name} className="w-8 h-8" color="currentColor" />
        <span
          className={`text-[8px] font-semibold uppercase leading-none ${
            isDarkMode ? "text-iron-500" : "text-slate-400"
          }`}
        >
          No image
        </span>
      </div>
    );
  }

  return (
    <div className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 ${bg}`}>
      <Image
        src={url}
        alt=""
        fill
        className="object-cover"
        sizes="56px"
        unoptimized={exerciseImageUnoptimized(url)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
