import { cn } from "@/lib/utils";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";

registerComponent({
  type: "form",
  displayName: "Form",
  category: "form",
  isContainer: true,
  defaultProps: { direction: "column", gap: 12 },
  defaultLayout: { width: "full", align: "stretch" },
  events: ["onSubmit"],
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
  ],
  render: ({ resolved, children, fireEvent }) => {
    const direction = (resolved.direction as string) ?? "column";
    const gap = (resolved.gap as number) ?? 12;
    return (
      <form
        className={cn("flex", direction === "row" ? "flex-row flex-wrap" : "flex-col")}
        style={{ gap }}
        onSubmit={(e) => {
          e.preventDefault();
          fireEvent("onSubmit");
        }}
      >
        {children}
      </form>
    );
  },
});
