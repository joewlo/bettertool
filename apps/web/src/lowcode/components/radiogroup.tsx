import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";
import { resolveInputValue } from "./textinput";

type Option = { label: string; value: string | number };

function parseOptions(raw: unknown): Option[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (o): o is Option => o !== null && typeof o === "object" && "label" in o && "value" in o,
  );
}

registerComponent({
  type: "radiogroup",
  displayName: "Radio Group",
  category: "input",
  defaultProps: { label: "", value: "", options: [], disabled: false, orientation: "vertical" },
  defaultLayout: { width: "grow", align: "stretch" },
  events: ["onChange"],
  props: [
    { name: "label", label: "Label", type: "string", default: "" },
    { name: "value", label: "Value", type: "string", bindable: true },
    {
      name: "options",
      label: "Options",
      type: "json",
      default: [],
      bindable: true,
      description: 'JSON array of {label, value} e.g. [{"label":"A","value":"a"}]',
    },
    { name: "disabled", label: "Disabled", type: "boolean", default: false, bindable: true },
    {
      name: "orientation",
      label: "Orientation",
      type: "select",
      default: "vertical",
      options: [
        { label: "Vertical", value: "vertical" },
        { label: "Horizontal", value: "horizontal" },
      ],
    },
  ],
  render: ({ node, resolved, componentState, setComponentState, fireEvent }) => {
    const value = resolveInputValue(node, "value", resolved, componentState);
    const displayed = value === undefined || value === null ? "" : String(value);
    const disabled = Boolean(resolved.disabled);
    const label = (resolved.label as string) ?? "";
    const orientation = (resolved.orientation as string) ?? "vertical";
    const options = parseOptions(resolved.options);
    return (
      <div className="flex flex-col gap-1.5">
        {label ? <Label>{label}</Label> : null}
        <RadioGroup
          value={displayed}
          disabled={disabled}
          orientation={orientation === "horizontal" ? "horizontal" : "vertical"}
          className={cn(
            orientation === "horizontal" ? "flex flex-row flex-wrap gap-4" : "flex flex-col gap-2",
          )}
          onValueChange={(v) => {
            setComponentState("value", v);
            fireEvent("onChange");
          }}
        >
          {options.map((o) => {
            const id = `${node.id}-opt-${String(o.value)}`;
            return (
              <div key={String(o.value)} className="flex items-center gap-2">
                <RadioGroupItem value={String(o.value)} id={id} disabled={disabled} />
                <Label htmlFor={id} className="cursor-pointer font-normal">
                  {o.label}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    );
  },
});
