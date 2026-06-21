import { useDraggable } from "@dnd-kit/core";
import {
  Box,
  Columns3,
  Database,
  FormInput,
  Hash,
  ListOrdered,
  Pilcrow,
  Square,
  Table as TableIcon,
  ToggleLeft,
  Type,
} from "lucide-react";

import { listComponentDefinitions } from "@/lowcode/registry";
import type { ComponentDefinition } from "@/lowcode/types";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: ComponentDefinition["category"][] = [
  "layout",
  "display",
  "input",
  "form",
  "data",
  "chart",
];

const CATEGORY_LABELS: Record<ComponentDefinition["category"], string> = {
  layout: "Layout",
  display: "Display",
  input: "Input",
  form: "Form",
  data: "Data",
  chart: "Chart",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: Type,
  button: Pilcrow,
  textinput: FormInput,
  numberinput: Hash,
  select: ToggleLeft,
  container: Box,
  table: TableIcon,
  modal: Square,
  form: ListOrdered,
};

const FALLBACK_ICON = Columns3;

function PaletteChip({ def }: { def: ComponentDefinition }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${def.type}`,
    data: { source: "palette", componentType: def.type },
  });
  const Icon = TYPE_ICONS[def.type] ?? FALLBACK_ICON;
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border border-input bg-background px-2.5 py-2 text-left text-xs font-medium shadow-sm transition-colors hover:bg-accent",
        isDragging && "opacity-50",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{def.displayName}</span>
    </button>
  );
}

export function ComponentPalette() {
  const defs = listComponentDefinitions();
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: defs.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.category} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABELS[group.category]}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {group.items.map((def) => (
              <PaletteChip key={def.type} def={def} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
