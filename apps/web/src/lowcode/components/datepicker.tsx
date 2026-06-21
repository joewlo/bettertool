import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";
import { resolveInputValue } from "./textinput";

// v1 simplicity: a native <input type="date">. A full Radix-based calendar
// picker is heavy; native is good enough for v1.
registerComponent({
  type: "datepicker",
  displayName: "Date Picker",
  category: "input",
  defaultProps: { label: "", value: "", placeholder: "", disabled: false },
  defaultLayout: { width: "grow", align: "stretch" },
  events: ["onChange"],
  props: [
    { name: "label", label: "Label", type: "string", default: "" },
    {
      name: "value",
      label: "Value (ISO date)",
      type: "string",
      bindable: true,
      description: "ISO date string, e.g. 2025-01-31",
    },
    { name: "placeholder", label: "Placeholder", type: "string", default: "" },
    { name: "disabled", label: "Disabled", type: "boolean", default: false, bindable: true },
  ],
  render: ({ node, resolved, componentState, setComponentState, fireEvent }) => {
    const value = resolveInputValue(node, "value", resolved, componentState);
    const displayed = value === undefined || value === null ? "" : String(value);
    const placeholder = (resolved.placeholder as string) ?? "";
    const disabled = Boolean(resolved.disabled);
    const label = (resolved.label as string) ?? "";
    return (
      <div className="flex flex-col gap-1.5">
        {label ? <Label>{label}</Label> : null}
        <Input
          type="date"
          value={displayed}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            setComponentState("value", e.target.value);
            fireEvent("onChange");
          }}
        />
      </div>
    );
  },
});
