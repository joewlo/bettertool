import type { ComponentDefinition } from "./types";

export const componentRegistry: Record<string, ComponentDefinition> = {};

export function registerComponent(def: ComponentDefinition): void {
  componentRegistry[def.type] = def;
}

export function getComponentDefinition(type: string): ComponentDefinition | undefined {
  return componentRegistry[type];
}

export function listComponentDefinitions(): ComponentDefinition[] {
  return Object.values(componentRegistry);
}
