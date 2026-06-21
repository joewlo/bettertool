import { Button } from "@/components/ui/button";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";

registerComponent({
  type: "button",
  displayName: "Button",
  category: "input",
  defaultProps: { label: "Button", variant: "default", size: "default", disabled: false },
  defaultLayout: { width: "auto", align: "center" },
  events: ["onClick"],
  props: [
    { name: "label", label: "Label", type: "string", default: "Button", bindable: true },
    {
      name: "variant",
      label: "Variant",
      type: "select",
      default: "default",
      options: [
        { label: "Default", value: "default" },
        { label: "Outline", value: "outline" },
        { label: "Secondary", value: "secondary" },
        { label: "Destructive", value: "destructive" },
        { label: "Ghost", value: "ghost" },
        { label: "Link", value: "link" },
      ],
    },
    {
      name: "size",
      label: "Size",
      type: "select",
      default: "default",
      options: [
        { label: "Default", value: "default" },
        { label: "Small", value: "sm" },
        { label: "Large", value: "lg" },
      ],
    },
    { name: "disabled", label: "Disabled", type: "boolean", default: false, bindable: true },
  ],
  render: ({ resolved, fireEvent }) => {
    const label = resolved.label === undefined || resolved.label === null ? "" : String(resolved.label);
    const variant = (resolved.variant as "default" | "outline" | "secondary" | "destructive" | "ghost" | "link") ?? "default";
    const size = (resolved.size as "default" | "sm" | "lg") ?? "default";
    const disabled = Boolean(resolved.disabled);
    return (
      <Button variant={variant} size={size} disabled={disabled} onClick={() => fireEvent("onClick")}>
        {label}
      </Button>
    );
  },
});
