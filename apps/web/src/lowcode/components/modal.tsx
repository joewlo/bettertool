import type { ComponentNode } from "@bettertool/shared";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isBindableString } from "@bettertool/reactive";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";

function resolveOpen(
  node: ComponentNode,
  resolved: Record<string, unknown>,
  componentState: Record<string, unknown>,
): boolean {
  const raw = node.props.open;
  if (isBindableString(raw)) {
    return Boolean(resolved.open);
  }
  if (raw !== undefined) {
    return Boolean(raw);
  }
  return Boolean(componentState.open);
}

registerComponent({
  type: "modal",
  displayName: "Modal",
  category: "layout",
  isContainer: true,
  defaultProps: { title: "Modal", open: false },
  defaultLayout: { width: "auto", align: "center" },
  props: [
    { name: "title", label: "Title", type: "string", default: "Modal", bindable: true },
    { name: "open", label: "Open", type: "boolean", default: false, bindable: true, description: "Controlled by openModal/closeModal actions." },
  ],
  render: ({ node, resolved, componentState, setComponentState, children, isEditor }) => {
    const open = resolveOpen(node, resolved, componentState);
    const title = (resolved.title as string) ?? "Modal";

    if (isEditor) {
      return (
        <div className="w-full rounded-md border-2 border-dashed border-primary/40 bg-muted/20 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Modal: {title} {open ? "(open)" : "(closed)"}
          </div>
          <div className="rounded-md border bg-background p-3">{children}</div>
        </div>
      );
    }

    return (
      <Dialog
        open={open}
        onOpenChange={(o) => setComponentState("open", o)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div>{children}</div>
        </DialogContent>
      </Dialog>
    );
  },
});
