import { cn } from "@/lib/utils";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";

registerComponent({
  type: "grid",
  displayName: "Grid",
  category: "layout",
  isContainer: true,
  defaultProps: {
    columns: "1fr 1fr",
    gap: 12,
    padding: 12,
    showBorder: false,
    background: "",
  },
  defaultLayout: { width: "full", align: "stretch" },
  props: [
    {
      name: "columns",
      label: "Columns",
      type: "string",
      default: "1fr 1fr",
      description: 'CSS grid-template-columns. E.g. "1fr 1fr" (equal), "2fr 1fr" (wide+narrow), "200px 1fr 1fr", "repeat(3, 1fr)".',
    },
    { name: "gap", label: "Gap (px)", type: "number", default: 12 },
    { name: "padding", label: "Padding (px)", type: "number", default: 12 },
    { name: "showBorder", label: "Show Border", type: "boolean", default: false },
    { name: "background", label: "Background", type: "color", default: "" },
  ],
  render: ({ resolved, children, isEditor, isSelected }) => {
    const columns = (resolved.columns as string) ?? "1fr 1fr";
    const gap = (resolved.gap as number) ?? 12;
    const padding = (resolved.padding as number) ?? 12;
    const showBorder = Boolean(resolved.showBorder);
    const background = (resolved.background as string) ?? "";
    const showGuide = isEditor && !isSelected && !showBorder;
    return (
      <div
        className={cn(
          "grid min-h-[44px] rounded-md",
          showBorder && "border border-dashed border-border",
          showGuide && "border-2 border-dashed border-muted-foreground/15",
        )}
        style={{
          gridTemplateColumns: columns,
          gap,
          padding,
          background:
            isEditor && isSelected
              ? `repeating-linear-gradient(0deg, var(--primary)/0.06 0px, var(--primary)/0.06 1px, transparent 1px, transparent ${gap}px), ` +
                `repeating-linear-gradient(90deg, var(--primary)/0.06 0px, var(--primary)/0.06 1px, transparent 1px, transparent ${gap}px)` +
                (background ? `, ${background}` : "")
              : background || undefined,
        }}
      >
        {children}
      </div>
    );
  },
});
