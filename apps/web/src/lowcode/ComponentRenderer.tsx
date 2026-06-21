import type { ComponentNode } from "@bettertool/shared";
import {
  type ActionContext,
  type EngineState,
  fireEvent as fireComponentEvent,
  isBindableString,
} from "@bettertool/reactive";

import { getComponentDefinition } from "./registry";
import type { RenderProps } from "./types";

export interface ComponentRendererProps {
  node: ComponentNode;
  engine: EngineState;
  ctx: ActionContext;
  renderChild: (node: ComponentNode) => React.ReactNode;
  isEditor?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onStateChange: () => void;
}

export function ComponentRenderer({
  node,
  engine,
  ctx,
  renderChild,
  isEditor = false,
  isSelected = false,
  onSelect,
  onStateChange,
}: ComponentRendererProps) {
  const def = getComponentDefinition(node.type);

  // Computed fresh each render so binding results (written asynchronously by
  // the engine) are reflected as soon as the engine notifies subscribers.
  const resolved = buildResolved(node, engine);
  const componentState = engine.getComponentState(node.id) ?? {};

  if (!def) {
    return (
      <div className="rounded-md border-2 border-destructive bg-destructive/10 p-2 text-sm text-destructive">
        Unknown component: {node.type}
      </div>
    );
  }

  const setComponentState = (property: string, value: unknown) => {
    engine.setComponentState(node.id, property, value);
    onStateChange();
  };

  const fireEvent = async (eventType: string) => {
    await fireComponentEvent(node, eventType, ctx);
    onStateChange();
  };

  const children = def.isContainer ? node.children.map((c) => renderChild(c)) : undefined;

  const renderProps: RenderProps = {
    node,
    resolved,
    componentState,
    setComponentState,
    fireEvent,
    children,
    isEditor,
    isSelected,
    onSelect: () => onSelect?.(),
  };

  // Render `def.render` as a real component so implementations may use hooks
  // (e.g. the Table component uses useState/useMemo for pagination).
  const RenderComp = def.render as React.FC<RenderProps>;
  return <RenderComp {...renderProps} />;
}

function buildResolved(node: ComponentNode, engine: EngineState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [prop, raw] of Object.entries(node.props)) {
    const key = `${node.id}.${prop}`;
    const result = engine.results[key];
    if (result) {
      out[prop] = result.value;
    } else if (!isBindableString(raw)) {
      out[prop] = raw;
    } else {
      out[prop] = undefined;
    }
  }
  return out;
}
