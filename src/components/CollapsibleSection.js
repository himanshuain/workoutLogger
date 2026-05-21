import { useState } from "react";
import {
  ChartBody,
  ChartCollapsibleHeader,
  ChartSection,
} from "@/components/charts/ChartChrome";

export default function CollapsibleSection({
  title,
  icon: Icon,
  count,
  defaultOpen = false,
  children,
  isDarkMode = true,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <ChartSection isDarkMode={isDarkMode}>
      <ChartCollapsibleHeader
        isDarkMode={isDarkMode}
        icon={Icon}
        label={title}
        meta={count !== undefined ? `${count} items` : undefined}
        expanded={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      />

      {isOpen && (
        <ChartBody isDarkMode={isDarkMode} className="space-y-2 pt-2">
          {children}
        </ChartBody>
      )}
    </ChartSection>
  );
}
