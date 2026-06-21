import { Children } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";

type Tab = { label: string; value: string };

function parseTabs(raw: unknown): Tab[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is Tab => t !== null && typeof t === "object" && "label" in t && "value" in t)
    .map((t) => ({ label: String(t.label), value: String(t.value) }));
}

registerComponent({
  type: "tabs",
  displayName: "Tabs",
  category: "layout",
  isContainer: true,
  defaultProps: { tabs: [], defaultTab: "" },
  defaultLayout: { width: "full", align: "stretch" },
  events: ["onTabChange"],
  props: [
    {
      name: "tabs",
      label: "Tabs",
      type: "json",
      default: [],
      description: 'JSON array of {label, value} e.g. [{"label":"Tab 1","value":"t1"}]. Children are mapped to tabs by index.',
    },
    { name: "defaultTab", label: "Default Tab", type: "string", default: "" },
  ],
  render: ({ resolved, componentState, setComponentState, fireEvent, children }) => {
    const tabs = parseTabs(resolved.tabs);
    const childArr = Children.toArray(children);
    const defaultTab = (resolved.defaultTab as string) ?? "";
    const stateTab = (componentState.activeTab as string) ?? "";
    const activeValue = stateTab || defaultTab || tabs[0]?.value || "";

    return (
      <Tabs
        value={activeValue}
        onValueChange={(v) => {
          setComponentState("activeTab", v);
          fireEvent("onTabChange");
        }}
        className="w-full"
      >
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t, i) => (
          <TabsContent key={t.value} value={t.value}>
            {childArr[i] ?? null}
          </TabsContent>
        ))}
      </Tabs>
    );
  },
});
