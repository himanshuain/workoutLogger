import { useCallback, useEffect, useRef, useState } from "react";
import ExerciseIcon from "@/components/ExerciseIcon";
import ExerciseMediaImage from "@/components/exercises/ExerciseMediaImage";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import PendingIcon from "@/components/ui/PendingIcon";
import PendingPlaceOverlay from "@/components/ui/PendingPlaceOverlay";

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
  /** Remove this slide from the exercise (custom or hidden catalog URL). */
  onDeleteUrl,
  /** URL currently being removed — shows overlay + spinner on that slide only. */
  deletingUrl = null,
}) {
  const wrapRef = useRef(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const list = Array.isArray(urls) ? urls.filter(u => typeof u === "string" && u.trim()) : [];

  const frameAspect = compact
    ? "aspect-[4/3] max-h-[min(38vh,240px)] w-full"
    : aspectClassName;

  const compactOuter = compact
    ? cn(
        "rounded-2xl p-2 ring-1",
        isDarkMode
          ? "bg-iron-800/35 ring-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
          : "bg-slate-100/90 ring-black/[0.06]",
      )
    : "";

  const compactInner = compact
    ? cn(
        "relative overflow-hidden rounded-xl",
        isDarkMode ? "bg-iron-950/95" : "bg-white",
      )
    : "";

  const frameSurface = (extra = "") =>
    cn(
      compact ? compactInner : "relative overflow-hidden rounded-card",
      frameAspect,
      !compact && (isDarkMode ? "bg-iron-900" : "bg-slate-200"),
      extra,
    );

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
    list.length > 1 && !onDeleteUrl && "pointer-events-none",
  );

  const slideIsDeleting = url =>
    Boolean(
      deletingUrl &&
        (deletingUrl === url || normalizeSlideKey(deletingUrl) === normalizeSlideKey(url)),
    );

  const deleteBtn = url => {
    if (!onDeleteUrl) return null;
    const pending = slideIsDeleting(url);
    const anyPending = Boolean(deletingUrl);
    return (
      <button
        type="button"
        disabled={anyPending}
        aria-label={pending ? "Removing image" : "Remove image"}
        aria-busy={pending}
        className={cn(
          "pointer-events-auto absolute z-30 flex items-center justify-center rounded-full border shadow-lg transition-opacity",
          compact
            ? "top-2.5 right-2.5 h-8 w-8 border-white/20 bg-black/55 text-white backdrop-blur-md active:bg-black/70"
            : cn(
                "top-2 right-2 h-9 w-9",
                isDarkMode
                  ? "border-iron-600 bg-iron-950/90 text-iron-100 active:bg-iron-800"
                  : "border-slate-200 bg-white/95 text-slate-800 active:bg-slate-100",
              ),
          anyPending && !pending && "opacity-40",
          pending && "opacity-100",
        )}
        onClick={e => {
          e.stopPropagation();
          e.preventDefault();
          if (anyPending) return;
          onDeleteUrl(url);
        }}
      >
        <PendingIcon pending={pending} iconClassName="h-4 w-4">
          <Trash2 className="h-4 w-4" aria-hidden />
        </PendingIcon>
      </button>
    );
  };

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
      <div className={cn(ring, compactOuter, className)}>
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
      <div className={cn("relative w-full", compactOuter, className)}>
        <div className={frameSurface()}>
          <ExerciseMediaImage
            src={u}
            alt={alt ? `${alt} demonstration` : "Exercise"}
            fill
            className={imgObjectClass}
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <PendingPlaceOverlay pending={slideIsDeleting(u)} />
          {deleteBtn(u)}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", compactOuter, className)}>
      <div className={frameSurface()}>
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
            <div
              key={normalizeSlideKey(u)}
              className="relative min-w-full w-full shrink-0 h-full snap-center snap-always"
            >
              <ExerciseMediaImage
                src={u}
                alt={alt || "Exercise"}
                fill
                className={imgObjectClass}
                sizes="(max-width: 768px) 100vw, 400px"
                draggable={false}
              />
              <PendingPlaceOverlay pending={slideIsDeleting(u)} />
              {deleteBtn(u)}
            </div>
          ))}
        </div>
      </div>
      <p
        className={cn(
          "text-center text-[11px] mt-1.5",
          compact ? "mt-2 text-[10px] font-medium tracking-wide text-iron-500" : "",
          !compact && (isDarkMode ? "text-iron-500" : "text-slate-400"),
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
