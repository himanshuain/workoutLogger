import { cn } from "@/lib/utils";

/** Standard press — pills, buttons, segments (scale 0.97). */
export const touchPress =
  "touch-press touch-manipulation select-none [-webkit-tap-highlight-color:transparent]";

/** Large tappable cards / list rows (scale 0.985). */
export const touchPressCard =
  "touch-press-card touch-manipulation select-none [-webkit-tap-highlight-color:transparent]";

/** Bottom nav items (scale 0.94). */
export const touchPressNav =
  "touch-press-nav touch-manipulation select-none [-webkit-tap-highlight-color:transparent]";

export function pressable(className, variant = "default") {
  const base =
    variant === "card" ? touchPressCard : variant === "nav" ? touchPressNav : touchPress;
  return cn(base, className);
}

/** Light tap — toggles, pills, nav commit. */
export function hapticLight() {
  if (typeof window === "undefined" || !window.navigator?.vibrate) return;
  window.navigator.vibrate(8);
}

/** Selection change while dragging (nav scrub). */
export function hapticSelect() {
  if (typeof window === "undefined" || !window.navigator?.vibrate) return;
  window.navigator.vibrate(5);
}

/** Primary actions — start workout, save, confirm. */
export function hapticMedium() {
  if (typeof window === "undefined" || !window.navigator?.vibrate) return;
  window.navigator.vibrate(12);
}

/** Wrap a handler with standard light haptic. */
export function withHaptic(handler, level = "light") {
  return (...args) => {
    if (level === "medium") hapticMedium();
    else if (level === "select") hapticSelect();
    else hapticLight();
    return handler?.(...args);
  };
}
