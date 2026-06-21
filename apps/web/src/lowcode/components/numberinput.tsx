import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";
import { resolveInputValue } from "./textinput";

registerComponent({
  type: "numberinput",
  displayName: "Number Input",
  category: "input",
  defaultProps: { placeholder: "", label: "", disabled: false, min: 0, max: 100, step: 1 },
  defaultLayout: { width: "grow", align: "stretch" },
  events: ["onChange"],
  props: [
    { name: "label", label: "Label", type: "string", default: "" },
    { name: "placeholder", label: "Placeholder", type: "string", default: "" },
    { name: "value", label: "Value", type: "number", bindable: true },
    { name: "disabled", label: "Disabled", type: "boolean", default: false, bindable: true },
    { name: "min", label: "Min", type: "number", default: 0 },
    { name: "max", label: "Max", type: "number", default: 100 },
    { name: "step", label: "Step", type: "number", default: 1 },
  ],
  render: ({ node, resolved, componentState, setComponentState, fireEvent }) => {
    const value = resolveInputValue(node, "value", resolved, componentState);
    const displayed = value === undefined || value === null ? "" : String(value);
    const placeholder = (resolved.placeholder as string) ?? "";
    const disabled = Boolean(resolved.disabled);
    const label = (resolved.label as string) ?? "";
    const min = resolved.min as number | undefined;
    const max = resolved.max as number | undefined;
    const step = (resolved.step as number) ?? 1;
    return (
      <div className="flex flex-col gap-1.5">
        {label ? <Label>{label}</Label> : null}
        <Input
          type="number"
          value={displayed}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const num = e.target.value === "" ? "" : Number(e.target.value);
            setComponentState("value", num);
            fireEvent("onChange");
          }}
        />
      </div>
    );
  },
});
