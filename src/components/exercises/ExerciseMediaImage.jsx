import Image from "next/image";
import { exerciseImageUnoptimized } from "@/lib/exerciseMedia";
import { cn } from "@/lib/utils";

/**
 * Renders exercise thumbnails/GIFs. Uses a native &lt;img&gt; for data: URLs (uploaded GIFs).
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
  if (!src) return null;

  if (String(src).startsWith("data:")) {
    return (
      <img
        src={src}
        alt={alt}
        draggable={draggable}
        onError={onError}
        className={cn(fill && "absolute inset-0 h-full w-full", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
      sizes={sizes}
      unoptimized={exerciseImageUnoptimized(src)}
      onError={onError}
      draggable={draggable}
    />
  );
}
