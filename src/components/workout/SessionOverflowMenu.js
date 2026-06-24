import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { MoreVertical, Pencil, Trash2, Undo2 } from "lucide-react";

const MENU_WIDTH = 176;

export default function SessionOverflowMenu({
  isOpen,
  onOpenChange,
  isDarkMode,
  onEdit,
  onDelete,
  onUndo,
  showUndo = false,
}) {
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);

  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) {
      setMenuStyle(null);
      return;
    }

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight ?? 132;
      const gap = 6;
      const fitsBelow = rect.bottom + gap + menuHeight <= window.innerHeight - 8;
      const top = fitsBelow ? rect.bottom + gap : rect.top - gap - menuHeight;
      const left = Math.min(
        Math.max(8, rect.right - MENU_WIDTH),
        window.innerWidth - MENU_WIDTH - 8,
      );

      setMenuStyle({ top, left, width: MENU_WIDTH });
    };

    updatePosition();
    requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, showUndo]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointer = event => {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    };

    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = event => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onOpenChange]);

  const itemClass = cn(
    "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
    isDarkMode ? "text-iron-100 active:bg-iron-800" : "text-slate-800 active:bg-slate-100",
  );

  const menu = isOpen ? (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: menuStyle?.top ?? -9999,
        left: menuStyle?.left ?? -9999,
        width: MENU_WIDTH,
        zIndex: 9999,
        visibility: menuStyle ? "visible" : "hidden",
      }}
      className={cn(
        "overflow-hidden rounded-card border py-1 shadow-xl",
        isDarkMode ? "border-iron-700 bg-iron-900" : "border-slate-200 bg-white",
      )}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        className={itemClass}
        onClick={event => {
          event.stopPropagation();
          onOpenChange(false);
          onEdit?.();
        }}
      >
        <Pencil className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        Edit workout
      </button>
      {showUndo ? (
        <button
          type="button"
          role="menuitem"
          className={itemClass}
          onClick={event => {
            event.stopPropagation();
            onOpenChange(false);
            onUndo?.();
          }}
        >
          <Undo2 className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          Undo mark done
        </button>
      ) : null}
      <button
        type="button"
        role="menuitem"
        className={cn(
          itemClass,
          isDarkMode ? "text-red-400 active:bg-red-500/10" : "text-red-600 active:bg-red-50",
        )}
        onClick={event => {
          event.stopPropagation();
          onOpenChange(false);
          onDelete?.();
        }}
      >
        <Trash2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        Delete workout
      </button>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={event => {
          event.stopPropagation();
          onOpenChange(!isOpen);
        }}
        aria-label="Workout actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          isOpen
            ? isDarkMode
              ? "bg-iron-800 text-iron-200"
              : "bg-slate-100 text-slate-700"
            : isDarkMode
              ? "text-iron-500 hover:bg-iron-800/80 hover:text-iron-300"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
        )}
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>

      {typeof document !== "undefined" && menu
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}
