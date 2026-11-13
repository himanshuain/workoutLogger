import { useState, useEffect } from "react";
import ExerciseIcon from "@/components/ExerciseIcon";
import ExerciseMediaImage from "@/components/exercises/ExerciseMediaImage";
import { cn } from "@/lib/utils";
import { exerciseMediaUrl } from "@/lib/exerciseMedia";

/**
 * 56×56 list thumbnail from DB URLs. Missing/broken URL shows a neutral placeholder (row opens drawer).
 */
export default function ExerciseListThumbnail({ exercise, isDarkMode, mediaOverrides }) {
  const url = exerciseMediaUrl(exercise, mediaOverrides);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [exercise?.id, url]);

  const bg = isDarkMode ? "bg-iron-800" : "bg-slate-100";
  const iconClass = isDarkMode ? "text-iron-500" : "text-slate-400";

  if (!url || failed) {
    return (
      <div
        className={cn(
          "relative flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-card px-0.5",
          bg,
          iconClass,
        )}
        aria-hidden
      >
        <ExerciseIcon name={exercise?.name} className="h-8 w-8" color="currentColor" />
        <span
          className={cn(
            "text-[8px] font-semibold uppercase leading-none",
            isDarkMode ? "text-iron-500" : "text-slate-400",
          )}
        >
          No image
        </span>
      </div>
    );
  }

  return (
    <div className={`relative w-14 h-14 rounded-card overflow-hidden shrink-0 ${bg}`}>
      <ExerciseMediaImage
        src={url}
        alt=""
        fill
        className="object-cover"
        sizes="56px"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
