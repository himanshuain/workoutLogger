import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import ExerciseIcon from "@/components/ExerciseIcon";
import { cn } from "@/lib/utils";
import { exerciseImageUnoptimized } from "@/lib/exerciseMedia";

/**
 * Horizontal scroll-snap carousel for GIFs / thumbnails (touch-friendly).
 */
export default function ExerciseMediaCarousel({
  urls,
  alt,
  isDarkMode,
  className,
  aspectClassName = "aspect-[4/3]",
  /** Shorter max height for bottom sheets so actions stay on screen */
  compact = false,
}) {
  const wrapRef = useRef(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const list = Array.isArray(urls) ? urls.filter(u => typeof u === "string" && u.trim()) : [];

  const frameAspect = compact
    ? "aspect-[4/3] max-h-[min(34vh,220px)] w-full"
    : aspectClassName;

  const updateIndexFromScroll = useCallback(() => {
    const el = wrapRef.current;
    if (!el || list.length <= 1) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const i = Math.round(el.scrollLeft / w);
    setSlideIndex(Math.min(Math.max(0, i), list.length - 1));
  }, [list.length]);

  const urlsKey = list.join("|");

  /** Sheet drawer uses a short frame; `cover` crops tall anatomical art — `contain` keeps the full figure. */
  const imgObjectClass = cn(
    compact ? "object-contain object-center" : "object-cover",
    "select-none",
    list.length > 1 && "pointer-events-none",
  );

  useEffect(() => {
    setSlideIndex(0);
    const el = wrapRef.current;
    if (el) el.scrollLeft = 0;
  }, [urlsKey]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onScroll = () => updateIndexFromScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [updateIndexFromScroll]);

  const ring = cn(
    "relative w-full rounded-card overflow-hidden flex items-center justify-center",
    frameAspect,
    isDarkMode ? "bg-iron-900 text-iron-500" : "bg-slate-200 text-slate-400",
    "[&::-webkit-scrollbar]:hidden"
  );

  if (list.length === 0) {
    return (
      <div className={cn(ring, className)}>
        <ExerciseIcon name={alt} className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 opacity-90" color="currentColor" />
        <span
          className={cn(
            "absolute bottom-3 text-[11px] font-medium",
            isDarkMode ? "text-iron-500" : "text-slate-500",
          )}
        >
          No image in catalog
        </span>
      </div>
    );
  }

  if (list.length === 1) {
    const u = list[0];
    return (
      <div
        className={cn(
          `relative w-full rounded-card overflow-hidden`,
          frameAspect,
          isDarkMode ? "bg-iron-900" : "bg-slate-200",
          className
        )}
      >
        <Image
          src={u}
          alt={alt ? `${alt} demonstration` : "Exercise"}
          fill
          className={imgObjectClass}
          sizes="(max-width: 768px) 100vw, 400px"
          unoptimized={exerciseImageUnoptimized(u)}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)}>
      <div className={`relative rounded-card overflow-hidden ${isDarkMode ? "bg-iron-900" : "bg-slate-200"} ${frameAspect}`}>
        <div className="absolute inset-y-0 right-3 z-10 flex flex-col justify-center gap-1 pointer-events-none">
          <span className="sr-only" aria-live="polite">{`Slide ${slideIndex + 1} of ${list.length}`}</span>
          {list.map((_, i) => (
            <span
              key={`dot-${i}`}
              className={cn(
                "w-2 h-2 rounded-full shrink-0 transition-opacity",
                i === slideIndex
                  ? isDarkMode
                    ? "bg-lift-primary"
                    : "bg-workout-primary"
                  : isDarkMode
                    ? "bg-white/25"
                    : "bg-black/30"
              )}
            />
          ))}
        </div>

        <div
          ref={wrapRef}
          role="region"
          aria-roledescription="carousel"
          aria-label={alt ? `${alt} images` : "Exercise images"}
          className="absolute inset-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
          tabIndex={0}
          onScroll={updateIndexFromScroll}
        >
          {list.map(u => (
            <div key={normalizeSlideKey(u)} className="min-w-full w-full shrink-0 h-full snap-center snap-always relative">
              <Image
                src={u}
                alt={alt || "Exercise"}
                fill
                className={imgObjectClass}
                sizes="(max-width: 768px) 100vw, 400px"
                draggable={false}
                unoptimized={exerciseImageUnoptimized(u)}
              />
            </div>
          ))}
        </div>
      </div>
      <p
        className={cn(
          "text-center text-[11px] mt-1.5",
          compact ? "mt-1 text-[10px] leading-tight" : "",
          isDarkMode ? "text-iron-500" : "text-slate-400",
        )}
      >
        Swipe for more angles
      </p>
    </div>
  );
}

function normalizeSlideKey(u) {
  try {
    return new URL(u).href;
  } catch {
    return u;
  }
}
