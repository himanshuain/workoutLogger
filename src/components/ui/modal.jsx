import * as React from "react";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared with SheetTopActions — pinned action row under drawer close. */
export const modalSheetTopActionsClass =
  "absolute left-3 top-3 z-[60] flex max-w-[calc(100%-3.5rem)] items-center gap-2";

export const modalSheetHeaderBelowActionsClass = "shrink-0 px-4 pb-2 pt-14";

/** Drag up to full height; default opens around half viewport. */
export const MODAL_SHEET_SNAP_POINTS = [0.55, 1];

const Modal = ({ children, snapPoints = MODAL_SHEET_SNAP_POINTS, ...props }) => (
  <Drawer.Root
    shouldScaleBackground={false}
    setBackgroundColorOnScale={false}
    repositionInputs={false}
    snapPoints={snapPoints}
    {...props}
  >
    {children}
  </Drawer.Root>
);
Modal.displayName = "Modal";

const NestedModal = ({ children, snapPoints = MODAL_SHEET_SNAP_POINTS, ...props }) => (
  <Drawer.NestedRoot repositionInputs={false} snapPoints={snapPoints} {...props}>
    {children}
  </Drawer.NestedRoot>
);
NestedModal.displayName = "NestedModal";

const ModalTrigger = Drawer.Trigger;
const ModalPortal = Drawer.Portal;
const ModalClose = Drawer.Close;

const ModalOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <Drawer.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300",
      className,
    )}
    {...props}
  />
));
ModalOverlay.displayName = "ModalOverlay";

const modalSheetHeightClass =
  "h-[96dvh] max-h-[96dvh] min-h-[min(55dvh,520px)]";

const ModalContent = React.forwardRef(
  ({ className, children, showCloseButton = true, showHandle = true, ...props }, ref) => {
    return (
      <Drawer.Portal>
        <ModalOverlay />
        <Drawer.Content
          ref={ref}
          className={cn(
            "fixed inset-x-0 bottom-0 z-[101] mx-auto flex w-full min-h-0 flex-col overflow-hidden rounded-t-card border-t border-surface-subtle bg-surface-section shadow-[var(--shadow-elevation-section)]",
            modalSheetHeightClass,
            !showHandle && "border-t-0",
            className,
          )}
          {...props}
        >
          {showHandle ? (
            <Drawer.Handle
              className="mx-auto mt-3 mb-2 h-1.5 w-12 flex-shrink-0 cursor-grab rounded-full bg-surface-pressed active:cursor-grabbing"
              aria-label="Drag to resize sheet"
            />
          ) : null}
          {children}
          {showCloseButton && (
            <Drawer.Close className="absolute right-3 top-3 z-[60] glass-close-btn">
              <span className="ripple-ring" />
              <X className="h-4 w-4 relative z-10 text-iron-400" />
              <span className="sr-only">Close</span>
            </Drawer.Close>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    );
  },
);
ModalContent.displayName = "ModalContent";

const ModalHeader = ({ className, ...props }) => (
  <div className={cn(modalSheetHeaderBelowActionsClass, className)} {...props} />
);
ModalHeader.displayName = "ModalHeader";

const ModalFooter = ({ className, ...props }) => (
  <div className={cn(modalSheetTopActionsClass, className)} {...props} />
);
ModalFooter.displayName = "ModalFooter";

const ModalTitle = React.forwardRef(({ className, ...props }, ref) => (
  <Drawer.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-[color:var(--text-primary)]",
      className,
    )}
    {...props}
  />
));
ModalTitle.displayName = "ModalTitle";

const ModalDescription = React.forwardRef(({ className, ...props }, ref) => (
  <Drawer.Description
    ref={ref}
    className={cn("text-sm text-[color:var(--text-muted)]", className)}
    {...props}
  />
));
ModalDescription.displayName = "ModalDescription";

const ModalBody = ({ className, ...props }) => (
  <div
    className={cn(
      "min-h-0 flex-1 overflow-y-auto px-4 py-2 pb-[max(1rem,env(safe-area-inset-bottom))]",
      className,
    )}
    {...props}
  />
);
ModalBody.displayName = "ModalBody";

export {
  Modal,
  NestedModal,
  ModalPortal,
  ModalOverlay,
  ModalTrigger,
  ModalClose,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  ModalBody,
};
