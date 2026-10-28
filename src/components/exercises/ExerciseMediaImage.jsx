import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { exerciseImageUnoptimized } from "@/lib/exerciseMedia";
import {
  cacheExerciseMediaAfterLoad,
  getCachedExerciseMediaSrc,
  preloadExerciseMedia,
  subscribeExerciseMediaCache,
} from "@/lib/exerciseMediaCache";
import { cn } from "@/lib/utils";

const MAX_LOAD_ATTEMPTS = 3;
const RETRY_MS = [0, 400, 1200];

/**
 * Renders exercise thumbnails/GIFs. Uses a native &lt;img&gt; for data: URLs (uploaded GIFs).
 * Retries transient load failures (common when many GIFs load during heavy init).
 * Successful loads are cached for the session (blob or pinned DOM) via exerciseMediaCache.
 */
export default function ExerciseMediaImage({
  src,
  alt = "",
  className,
  fill = false,
  sizes,
  onError,
  draggable = false,
}) {
  const [attempt, setAttempt] = useState(0);
  const [, cacheTick] = useState(0);

  useEffect(() => {
    setAttempt(0);
  }, [src]);

  useEffect(() => {
    if (!src || String(src).startsWith("data:")) return undefined;
    preloadExerciseMedia(src);
    return subscribeExerciseMediaCache(() => cacheTick(n => n + 1));
  }, [src]);

  const handleLoad = useCallback(() => {
    if (src) cacheExerciseMediaAfterLoad(src);
  }, [src]);

  const handleError = useCallback(() => {
    if (attempt + 1 < MAX_LOAD_ATTEMPTS) {
      const delay = RETRY_MS[attempt + 1] ?? 1200;
      window.setTimeout(() => setAttempt(a => a + 1), delay);
      return;
    }
    onError?.();
  }, [attempt, onError]);

  if (!src) return null;

  const displaySrc = getCachedExerciseMediaSrc(src);
  const attemptKey = `${displaySrc}::${attempt}`;

  if (String(displaySrc).startsWith("data:")) {
    return (
      <img
        key={attemptKey}
        src={displaySrc}
        alt={alt}
        draggable={draggable}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(fill && "absolute inset-0 h-full w-full", className)}
      />
    );
  }

  return (
    <Image
      key={attemptKey}
      src={displaySrc}
      alt={alt}
      fill={fill}
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
      sizes={sizes}
      unoptimized={exerciseImageUnoptimized(displaySrc)}
      onLoad={handleLoad}
      onError={handleError}
      draggable={draggable}
    />
  );
}
