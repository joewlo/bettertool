import type { EventAction } from "@bettertool/shared";

export interface ActionContext {
  runQuery: (queryId: string) => Promise<void>;
  setValue: (componentId: string, property: string, value: unknown) => void;
  setVariable: (name: string, value: unknown) => void;
  navigate: (pageId: string) => void;
  openModal: (componentId: string) => void;
  closeModal: (componentId: string) => void;
  showAlert: (message: string, variant: "info" | "success" | "warning" | "error") => void;
}

export async function dispatchActions(
  actions: EventAction[],
  ctx: ActionContext,
): Promise<void> {
  for (const action of actions) {
    switch (action.type) {
      case "runQuery":
        await ctx.runQuery(action.queryId);
        break;
      case "setValue":
        // `action.value` is a JS expression string (or literal). The ctx.setValue
        // implementation is responsible for resolving it via the sandbox against
        // the current model before mutating component state. A value with no `{{`
        // is treated as a literal string by the binding parser in the ctx impl.
        ctx.setValue(action.componentId, action.property, action.value);
        break;
      case "setVariable":
        ctx.setVariable(action.variable, action.value);
        break;
      case "navigate":
        ctx.navigate(action.pageId);
        break;
      case "openModal":
        ctx.openModal(action.componentId);
        break;
      case "closeModal":
        ctx.closeModal(action.componentId);
        break;
      case "showAlert":
        ctx.showAlert(action.message, action.variant);
        break;
    }
  }
}
