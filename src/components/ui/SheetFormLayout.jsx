import { cn } from "@/lib/utils";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody } from "@/components/ui/modal";
import {
  SheetTopActions,
  sheetTopActionButtonClass,
  sheetHeaderWithTopActionsClass,
} from "@/components/ui/sheetTopActions";

/**
 * Standard bottom sheet: optional primary action top-left, ✕ close on the right.
 */
export default function SheetFormLayout({
  open,
  onOpenChange,
  isDarkMode,
  title,
  children,
  primaryLabel = "Save",
  onPrimary,
  primaryDisabled = false,
  showCloseButton = true,
  contentClassName,
  bodyClassName,
  description,
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        showCloseButton={showCloseButton}
        className={cn(
          "flex min-h-0 flex-col overflow-hidden",
          isDarkMode ? "border-iron-800 bg-iron-900" : "border-slate-200 bg-white",
          contentClassName,
        )}
      >
        {onPrimary ? (
          <SheetTopActions>
            <button
              type="button"
              onClick={onPrimary}
              disabled={primaryDisabled}
              className={sheetTopActionButtonClass(isDarkMode, { primary: true })}
            >
              {primaryLabel}
            </button>
          </SheetTopActions>
        ) : null}
        {title ? (
          <ModalHeader className={sheetHeaderWithTopActionsClass}>
            <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>{title}</ModalTitle>
            {description ? (
              <p className={`text-sm ${isDarkMode ? "text-iron-500" : "text-slate-500"}`}>{description}</p>
            ) : null}
          </ModalHeader>
        ) : null}
        <ModalBody
          className={cn(
            "min-h-0 flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]",
            bodyClassName,
          )}
        >
          {children}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
