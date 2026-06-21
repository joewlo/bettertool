import type { ComponentNode, Event } from "@bettertool/shared";
import { dispatchActions, type ActionContext } from "./actions.js";

export function getEvent(component: ComponentNode, eventType: string): Event | undefined {
  return component.events.find((e) => e.type === eventType);
}

export async function fireEvent(
  component: ComponentNode,
  eventType: string,
  ctx: ActionContext,
): Promise<void> {
  const event = getEvent(component, eventType);
  if (!event) return;
  await dispatchActions(event.actions, ctx);
}
