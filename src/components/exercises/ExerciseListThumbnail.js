import { useState, useEffect } from "react";
import Image from "next/image";
import ExerciseIcon from "@/components/ExerciseIcon";
import { exerciseMediaUrl, exerciseImageUnoptimized } from "@/lib/exerciseMedia";

/**
 * 56×56 list thumbnail: DB URLs only; on load error falls back to silhouette (no broken image icon).
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
