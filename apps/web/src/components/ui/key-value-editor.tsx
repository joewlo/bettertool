import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface KeyValueEditorProps {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  className?: string;
}

export function KeyValueEditor({
  value,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  className,
}: KeyValueEditorProps) {
  const entries = Object.entries(value);

  function updateKey(index: number, newKey: string) {
    const next = entries.map(([k, v], i) => (i === index ? [newKey, v] : [k, v])) as Array<
      [string, string]
    >;
    onChange(compact(next));
  }

  function updateValue(index: number, newValue: string) {
    const next = entries.map(([k, v], i) => (i === index ? [k, newValue] : [k, v])) as Array<
      [string, string]
    >;
    onChange(compact(next));
  }

  function removeRow(index: number) {
    const next = entries.filter((_, i) => i !== index);
    onChange(compact(next as Array<[string, string]>));
  }

  function addRow() {
    onChange(compact([...entries, ["", ""]]));
  }

  return (
    <div className={cn("space-y-2", className)}>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No entries.</p>
      ) : (
        entries.map(([k, v], i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              className="flex-1"
              value={k}
              placeholder={keyPlaceholder}
              onChange={(e) => updateKey(i, e.target.value)}
            />
            <Input
              className="flex-1"
              value={v}
              placeholder={valuePlaceholder}
              onChange={(e) => updateValue(i, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeRow(i)}
              aria-label="Remove row"
            >
              <Trash2 />
            </Button>
          </div>
        ))
      )}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus />
        Add row
      </Button>
    </div>
  );
}

function compact(entries: Array<[string, string]>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of entries) {
    const key = k.trim();
    if (key) result[key] = v;
  }
  return result;
}
