import * as React from "react";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Modal = ({ children, ...props }) => (
  <Drawer.Root
    shouldScaleBackground
    setBackgroundColorOnScale={false}
    repositionInputs={false}
    {...props}
  >
    {children}
  </Drawer.Root>
);
Modal.displayName = "Modal";

const NestedModal = ({ children, ...props }) => (
  <Drawer.NestedRoot repositionInputs={false} {...props}>
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
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
      className,
    )}
    {...props}
  />
));
ModalOverlay.displayName = "ModalOverlay";

const ModalContent = React.forwardRef(
  ({ className, children, showCloseButton = true, ...props }, ref) => {
    return (
      <Drawer.Portal>
        <ModalOverlay />
        <Drawer.Content
          ref={ref}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[96vh] min-h-0 flex-col rounded-t-card border-t border-surface-subtle bg-surface-section shadow-[var(--shadow-elevation-section)]",
            className,
          )}
          {...props}
        >
          <div className="mx-auto mt-3 mb-1 h-1.5 w-12 flex-shrink-0 rounded-full bg-surface-pressed" />
          {children}
          {showCloseButton && (
            <Drawer.Close className="absolute right-3 top-3 glass-close-btn">
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
  <div className={cn("flex flex-col gap-1.5 p-4 pb-2", className)} {...props} />
);
ModalHeader.displayName = "ModalHeader";

const ModalFooter = ({ className, ...props }) => (
  <div className={cn("flex gap-2 p-4 pt-2", className)} {...props} />
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
    className={cn("px-4 py-2 max-h-[60vh] overflow-y-auto", className)}
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
