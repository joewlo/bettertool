import type { ReactNode } from "react";

import type { ComponentNode } from "@bettertool/shared";
import type { ActionContext, EngineState } from "@bettertool/reactive";

export interface PropDef {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "select" | "color" | "json" | "code";
  options?: { label: string; value: string | number }[];
  default?: unknown;
  bindable?: boolean;
  description?: string;
}

export interface ComponentDefinition {
  type: string;
  displayName: string;
  icon?: unknown;
  category: "layout" | "display" | "input" | "form" | "data" | "chart";
  isContainer?: boolean;
  defaultProps: Record<string, unknown>;
  defaultLayout?: ComponentNode["layout"];
  props: PropDef[];
  events?: string[];
  render: (props: RenderProps) => ReactNode;
}

export interface RenderProps {
  node: ComponentNode;
  resolved: Record<string, unknown>;
  componentState: Record<string, unknown>;
  setComponentState: (property: string, value: unknown) => void;
  fireEvent: (eventType: string) => void;
  children?: ReactNode;
  isSelected?: boolean;
  onSelect?: () => void;
  isEditor?: boolean;
}

export interface NodeWrapperProps {
  node: ComponentNode;
  engine: EngineState;
  ctx: ActionContext;
  renderChild: (node: ComponentNode) => ReactNode;
  isEditor: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
  onStateChange: () => void;
}

export function layoutClasses(layout: ComponentNode["layout"]): string {
  const width =
    layout.width === "auto"
      ? "w-auto"
      : layout.width === "full"
        ? "w-full"
        : "flex-1 min-w-0";
  const align =
    layout.align === "start"
      ? "self-start"
      : layout.align === "center"
        ? "self-center"
        : layout.align === "end"
          ? "self-end"
          : "self-stretch";
  return `${width} ${align}`;
}

// The shared `Page["components"]` is inferred as `unknown[]` because
// `componentNodeSchema` is typed `z.ZodType<unknown>`. This helper casts the
// parsed tree to the strongly-typed `ComponentNode[]` we use throughout the app.
export function asNodes(xs: unknown[] | undefined): ComponentNode[] {
  return (xs ?? []) as unknown as ComponentNode[];
}
