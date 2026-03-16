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
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
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
            "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[96vh] flex-col rounded-t-2xl border-t",
            className,
          )}
          {...props}
        >
          <div className="mx-auto mt-3 mb-1 h-1.5 w-12 flex-shrink-0 rounded-full bg-iron-600/40" />
          {children}
          {showCloseButton && (
            <Drawer.Close className="absolute right-4 top-4 rounded-lg p-1 text-iron-500 hover:text-iron-300 hover:bg-iron-800 transition-colors">
              <X className="h-5 w-5" />
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
      "text-lg font-semibold leading-none tracking-tight text-iron-100",
      className,
    )}
    {...props}
  />
));
ModalTitle.displayName = "ModalTitle";

const ModalDescription = React.forwardRef(({ className, ...props }, ref) => (
  <Drawer.Description
    ref={ref}
    className={cn("text-sm text-iron-500", className)}
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
