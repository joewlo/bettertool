import "./components/text";
import "./components/button";
import "./components/textinput";
import "./components/numberinput";
import "./components/select";
import "./components/container";
import "./components/table";
import "./components/modal";
import "./components/form";
import "./components/grid";
import "./components/checkbox";
import "./components/toggle";
import "./components/radiogroup";
import "./components/datepicker";
import "./components/multiselect";
import "./components/tabs";
import "./components/datagrid";
import "./components/chart";

import { componentRegistry, getComponentDefinition, listComponentDefinitions, registerComponent } from "./registry";

export type {
  ComponentDefinition,
  NodeWrapperProps,
  PropDef,
  RenderProps,
} from "./types";
export { componentRegistry, getComponentDefinition, listComponentDefinitions, registerComponent } from "./registry";
export { layoutClasses, asNodes } from "./types";
export { ComponentRenderer } from "./ComponentRenderer";
export type { ComponentRendererProps } from "./ComponentRenderer";
export { ViewNodeWrapper } from "./ViewNodeWrapper";
export { Runtime } from "./Runtime";
export type { RuntimeProps } from "./Runtime";

let initialized = false;
export function initRegistry(): void {
  if (initialized) return;
  initialized = true;
  // Force access so the side-effect imports above are retained and run.
  void componentRegistry;
  void listComponentDefinitions();
  void getComponentDefinition;
  void registerComponent;
}
