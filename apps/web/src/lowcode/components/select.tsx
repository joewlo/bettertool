import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";
import { resolveInputValue } from "./textinput";

type Option = { label: string; value: string | number };

function parseOptions(raw: unknown): Option[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (o): o is Option =>
      o !== null && typeof o === "object" && "label" in o && "value" in o,
  );
}

registerComponent({
  type: "select",
  displayName: "Select",
  category: "input",
  defaultProps: { placeholder: "Select...", label: "", disabled: false, options: [] },
  defaultLayout: { width: "grow", align: "stretch" },
  events: ["onChange"],
  props: [
    { name: "label", label: "Label", type: "string", default: "" },
    { name: "placeholder", label: "Placeholder", type: "string", default: "Select..." },
    { name: "value", label: "Value", type: "string", bindable: true },
    { name: "disabled", label: "Disabled", type: "boolean", default: false, bindable: true },
    {
      name: "options",
      label: "Options",
      type: "json",
      default: [],
      bindable: true,
      description: 'JSON array of {label, value} e.g. [{"label":"A","value":"a"}]',
    },
  ],
  render: ({ node, resolved, componentState, setComponentState, fireEvent }) => {
    const value = resolveInputValue(node, "value", resolved, componentState);
    const displayed = value === undefined || value === null ? "" : String(value);
    const placeholder = (resolved.placeholder as string) ?? "Select...";
    const disabled = Boolean(resolved.disabled);
    const label = (resolved.label as string) ?? "";
    const options = parseOptions(resolved.options);
    return (
      <div className="flex flex-col gap-1.5">
        {label ? <Label>{label}</Label> : null}
        <Select
          value={displayed}
          disabled={disabled}
          onValueChange={(v) => {
            setComponentState("value", v);
            fireEvent("onChange");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.length === 0 ? (
              <SelectItem value="__none__" disabled>
                No options
              </SelectItem>
            ) : (
              options.map((o) => (
                <SelectItem key={String(o.value)} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    );
  },
});
