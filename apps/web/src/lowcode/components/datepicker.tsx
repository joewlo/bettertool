import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";
import { resolveInputValue } from "./textinput";

function parseDateValue(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const d = parseISO(String(value));
  return isValid(d) ? d : undefined;
}

registerComponent({
  type: "datepicker",
  displayName: "Date Picker",
  category: "input",
  defaultProps: { label: "", value: "", placeholder: "Pick a date", disabled: false },
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
    { name: "placeholder", label: "Placeholder", type: "string", default: "Pick a date" },
    { name: "disabled", label: "Disabled", type: "boolean", default: false, bindable: true },
  ],
  render: ({ node, resolved, componentState, setComponentState, fireEvent }) => {
    const value = resolveInputValue(node, "value", resolved, componentState);
    const selected = parseDateValue(value);
    const placeholder = (resolved.placeholder as string) ?? "Pick a date";
    const disabled = Boolean(resolved.disabled);
    const label = (resolved.label as string) ?? "";
    const [open, setOpen] = useState(false);
    return (
      <div className="flex flex-col gap-1.5">
        {label ? <Label>{label}</Label> : null}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-left font-normal",
                !selected && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {selected ? format(selected, "MMM d, yyyy") : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              disabled={disabled}
              autoFocus
              onSelect={(date) => {
                setComponentState("value", date ? format(date, "yyyy-MM-dd") : "");
                fireEvent("onChange");
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  },
});
