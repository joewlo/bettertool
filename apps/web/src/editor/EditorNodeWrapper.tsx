import { type CSSProperties, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2 } from "lucide-react";

import { getComponentDefinition } from "@/lowcode/registry";
import { ComponentRenderer } from "@/lowcode/ComponentRenderer";
import { cn } from "@/lib/utils";
import { layoutClasses, type NodeWrapperProps } from "@/lowcode/types";

export function EditorNodeWrapper(props: NodeWrapperProps) {
  const { node, engine, ctx, renderChild, selectedId, onSelect, onRemove, onStateChange } = props;
  const def = getComponentDefinition(node.type);
  const isContainer = Boolean(def?.isContainer);
  const isSelected = selectedId === node.id;

  const sortable = useSortable({
    id: node.id,
    data: { type: "component", nodeId: node.id, isContainer },
  });
  const droppable = useDroppable({
    id: `container-${node.id}`,
    data: { type: "container", nodeId: node.id },
    disabled: !isContainer,
  });

  const setRef = useCallback(
    (el: HTMLElement | null) => {
      sortable.setNodeRef(el);
      droppable.setNodeRef(el);
    },
    [sortable, droppable],
  );

  const style: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(node.id);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(node.id);
  };

  return (
    <div
      ref={setRef}
      style={style}
      className={cn(
        layoutClasses(node.layout),
        "group relative",
        sortable.isDragging && "opacity-50",
      )}
      onMouseDown={handleSelect}
    >
      {isSelected && (
        <div className="absolute -top-5 left-0 z-10 flex items-center gap-1 rounded-t bg-primary px-1 text-xs text-primary-foreground">
          <span className="max-w-[160px] truncate">{node.name}</span>
          <button
            type="button"
            className="hover:text-destructive-foreground/80"
            onMouseDown={handleRemove}
            onClick={handleRemove}
            aria-label="Delete component"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
      <div
        className={cn(
          "relative rounded-sm",
          isSelected && "ring-2 ring-primary",
          isContainer && droppable.isOver && "ring-2 ring-primary/50",
          !isSelected && "hover:ring-1 hover:ring-primary/40",
        )}
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <ComponentRenderer
          node={node}
          engine={engine}
          ctx={ctx}
          renderChild={renderChild}
          isEditor
          isSelected={isSelected}
          onSelect={() => onSelect?.(node.id)}
          onStateChange={onStateChange}
        />
      </div>
    </div>
  );
}
