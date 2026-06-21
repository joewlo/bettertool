import { layoutClasses, type NodeWrapperProps } from "./types";
import { ComponentRenderer } from "./ComponentRenderer";

export function ViewNodeWrapper(props: NodeWrapperProps) {
  const { node, engine, ctx, renderChild, onStateChange } = props;
  return (
    <div className={layoutClasses(node.layout)}>
      <ComponentRenderer
        node={node}
        engine={engine}
        ctx={ctx}
        renderChild={renderChild}
        isEditor={false}
        onStateChange={onStateChange}
      />
    </div>
  );
}
