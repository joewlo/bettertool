import type { ComponentNode } from "@bettertool/shared";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isBindableString } from "@bettertool/reactive";
import { registerComponent } from "../registry";
import type { ComponentDefinition, RenderProps } from "../types";

function resolveInputValue(
  node: ComponentNode,
  prop: string,
  resolved: Record<string, unknown>,
  componentState: Record<string, unknown>,
): unknown {
  const raw = node.props[prop];
  if (isBindableString(raw)) {
    return resolved[prop];
  }
  if (componentState[prop] !== undefined) {
    return componentState[prop];
  }
  return raw;
}

registerComponent({
  type: "textinput",
  displayName: "Text Input",
  category: "input",
  defaultProps: { placeholder: "", label: "", disabled: false },
  defaultLayout: { width: "grow", align: "stretch" },
  events: ["onChange"],
  props: [
    { name: "label", label: "Label", type: "string", default: "" },
    { name: "placeholder", label: "Placeholder", type: "string", default: "" },
    { name: "value", label: "Value", type: "string", bindable: true, description: "Bind to {{components.<id>.value}} or another source. Unbound reads typed state." },
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

export type TextInputComponent = ComponentNode;
export { resolveInputValue };
