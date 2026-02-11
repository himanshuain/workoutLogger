import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Drawer = DialogPrimitive.Root;
const DrawerTrigger = DialogPrimitive.Trigger;
const DrawerPortal = DialogPrimitive.Portal;
const DrawerClose = DialogPrimitive.Close;

const DrawerOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DrawerOverlay.displayName = "DrawerOverlay";

const DrawerContent = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    const [keyboardVisible, setKeyboardVisible] = React.useState(false);
    const contentRef = React.useRef(null);

    React.useEffect(() => {
      // Detect keyboard on iOS/mobile by checking viewport height changes
      const initialHeight = window.innerHeight;
      
      const handleResize = () => {
        const currentHeight = window.visualViewport?.height || window.innerHeight;
        const heightDiff = initialHeight - currentHeight;
        // If height decreased by more than 150px, keyboard is likely open
        setKeyboardVisible(heightDiff > 150);
      };

      // Use visualViewport API if available (better for iOS)
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
        return () => window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      }
    }, []);

    // Handle focus on inputs to scroll them into view
    React.useEffect(() => {
      const content = contentRef.current;
      if (!content) return;

      const handleFocus = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          // Small delay to let keyboard appear
          setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      };

      content.addEventListener('focusin', handleFocus);
      return () => content.removeEventListener('focusin', handleFocus);
    }, []);

    return (
      <DrawerPortal>
        <DrawerOverlay />
        <DialogPrimitive.Content
          ref={(node) => {
            contentRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t border-iron-800 bg-iron-900 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            className,
          )}
          style={{
            maxHeight: keyboardVisible ? '85vh' : '90vh',
            paddingBottom: keyboardVisible ? '1rem' : 'calc(1.5rem + env(safe-area-inset-bottom))',
          }}
          {...props}
        >
          <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-iron-700 flex-shrink-0" />
          {children}
        </DialogPrimitive.Content>
      </DrawerPortal>
    );
  },
);
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-iron-100",
      className,
    )}
    {...props}
  />
));
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-iron-500", className)}
    {...props}
  />
));
DrawerDescription.displayName = "DrawerDescription";

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
