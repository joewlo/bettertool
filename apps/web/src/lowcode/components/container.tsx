import { cn } from "@/lib/utils";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";

registerComponent({
  type: "container",
  displayName: "Container",
  category: "layout",
  isContainer: true,
  defaultProps: {
    direction: "column",
    gap: 12,
    padding: 12,
    showBorder: false,
    background: "",
  },
  defaultLayout: { width: "full", align: "stretch" },
  props: [
    {
      name: "direction",
      label: "Direction",
      type: "select",
      default: "column",
      options: [
        { label: "Column", value: "column" },
        { label: "Row", value: "row" },
      ],
    },
    { name: "gap", label: "Gap (px)", type: "number", default: 12 },
    { name: "padding", label: "Padding (px)", type: "number", default: 12 },
    { name: "showBorder", label: "Show Border", type: "boolean", default: false },
    { name: "background", label: "Background", type: "color", default: "" },
  ],
  render: ({ resolved, children }) => {
    const direction = (resolved.direction as string) ?? "column";
    const gap = (resolved.gap as number) ?? 12;
    const padding = (resolved.padding as number) ?? 12;
    const showBorder = Boolean(resolved.showBorder);
    const background = (resolved.background as string) ?? "";
    return (
      <div
        className={cn(
          "flex min-h-[40px] min-w-[60px] rounded-md",
          direction === "row" ? "flex-row flex-wrap" : "flex-col",
          showBorder && "border border-dashed border-border",
        )}
        style={{ gap, padding, background: background || undefined }}
      >
        {children}
      </div>
    );
  },
});
