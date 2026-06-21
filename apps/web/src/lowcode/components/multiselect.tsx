import { useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

function parseValues(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => String(v));
}

registerComponent({
  type: "multiselect",
  displayName: "Multi-Select",
  category: "input",
  defaultProps: { label: "", values: [], options: [], placeholder: "Select...", disabled: false },
  defaultLayout: { width: "grow", align: "stretch" },
  events: ["onChange"],
  props: [
    { name: "label", label: "Label", type: "string", default: "" },
    {
      name: "values",
      label: "Values",
      type: "json",
      bindable: true,
      description: 'JSON string array of selected values, e.g. ["a","b"]',
    },
    {
      name: "options",
      label: "Options",
      type: "json",
      default: [],
      bindable: true,
      description: "JSON array of {label, value}",
    },
    { name: "placeholder", label: "Placeholder", type: "string", default: "Select..." },
    { name: "disabled", label: "Disabled", type: "boolean", default: false, bindable: true },
  ],
  render: ({ node, resolved, componentState, setComponentState, fireEvent }) => {
    const valuesRaw = resolveInputValue(node, "values", resolved, componentState);
    const selected = parseValues(valuesRaw);
    const options = parseOptions(resolved.options);
    const placeholder = (resolved.placeholder as string) ?? "Select...";
    const disabled = Boolean(resolved.disabled);
    const label = (resolved.label as string) ?? "";
    const [open, setOpen] = useState(false);

    const selectedSet = new Set(selected);
    const selectedLabels = options
      .filter((o) => selectedSet.has(String(o.value)))
      .map((o) => ({ label: o.label, value: String(o.value) }));

    const toggle = (val: string) => {
      const next = selectedSet.has(val)
        ? selected.filter((v) => v !== val)
        : [...selected, val];
      setComponentState("values", next);
      fireEvent("onChange");
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label ? <Label>{label}</Label> : null}
        <Popover open={disabled ? false : open} onOpenChange={(o) => { if (!disabled) setOpen(o); }}>
          <PopoverTrigger asChild>
            <div
              role="combobox"
              tabIndex={disabled ? -1 : 0}
              className={cn(
                "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring",
                disabled ? "pointer-events-none opacity-50" : "cursor-pointer",
              )}
            >
              {selectedLabels.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedLabels.map((s) => (
                  <Badge key={s.value} variant="secondary" className="gap-1 font-normal">
                    {s.label}
                    <button
                      type="button"
                      className="rounded-sm hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(s.value);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <div className="max-h-60 overflow-auto p-1">
              {options.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No options</div>
              ) : (
                options.map((o) => {
                  const val = String(o.value);
                  const isSel = selectedSet.has(val);
                  return (
                    <label
                      key={val}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <Checkbox checked={isSel} onCheckedChange={() => toggle(val)} />
                      {o.label}
                    </label>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  },
});
