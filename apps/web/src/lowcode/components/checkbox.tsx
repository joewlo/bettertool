import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";
import { resolveInputValue } from "./textinput";

registerComponent({
  type: "checkbox",
  displayName: "Checkbox",
  category: "input",
  defaultProps: { label: "", value: false, disabled: false },
  defaultLayout: { width: "auto", align: "center" },
  events: ["onChange"],
  props: [
    { name: "label", label: "Label", type: "string", default: "" },
    { name: "value", label: "Value", type: "boolean", bindable: true },
    { name: "disabled", label: "Disabled", type: "boolean", default: false, bindable: true },
  ],
  render: ({ node, resolved, componentState, setComponentState, fireEvent }) => {
    const value = resolveInputValue(node, "value", resolved, componentState);
    const checked = Boolean(value);
    const disabled = Boolean(resolved.disabled);
    const label = (resolved.label as string) ?? "";
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(c) => {
            setComponentState("value", c === true);
            fireEvent("onChange");
          }}
        />
        {label ? <Label className="cursor-pointer">{label}</Label> : null}
      </div>
    );
  },
});
