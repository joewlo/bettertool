import { useEffect, useMemo, useReducer, useState } from "react";
import { Braces, Code, Plus, Trash2 } from "lucide-react";

import type {
  ComponentNode,
  Event,
  EventAction,
} from "@bettertool/shared";
import type { EngineState } from "@bettertool/reactive";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getComponentDefinition } from "@/lowcode/registry";
import { asNodes, type PropDef } from "@/lowcode/types";
import { isBindableString } from "@bettertool/reactive";

import { useEditorStore, type EditorStore } from "./editor-store";

function flattenComponents(nodes: ComponentNode[]): ComponentNode[] {
  const out: ComponentNode[] = [];
  for (const n of nodes) {
    out.push(n);
    if (n.children.length > 0) out.push(...flattenComponents(n.children));
  }
  return out;
}

function isJsValue(raw: unknown): boolean {
  return isBindableString(raw);
}

function innerExpr(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const m = raw.match(/^\s*{{([\s\S]*)}}\s*$/);
  return m ? (m[1] ?? "").trim() : raw.replace(/{{|}}/g, "").trim();
}

function PropField({
  def,
  value,
  onChange,
  error,
}: {
  def: PropDef;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const bindable = def.bindable !== false;
  const js = isJsValue(value);

  function setLiteral(v: unknown) {
    onChange(v);
  }
  function setExpr(inner: string) {
    onChange(`{{${inner}}}`);
  }
  function toggleJs() {
    if (js) {
      onChange(innerExpr(value));
    } else {
      const inner = typeof value === "string" && value.length > 0 ? value : "";
      onChange(`{{${inner}}}`);
    }
  }

  const literalInput = (() => {
    switch (def.type) {
      case "boolean":
        return (
          <div className="flex items-center gap-2">
            <Switch checked={Boolean(value)} onCheckedChange={(v) => setLiteral(v)} />
            <span className="text-xs text-muted-foreground">{value ? "true" : "false"}</span>
          </div>
        );
      case "number":
        return (
          <Input
            type="number"
            className="h-8"
            value={typeof value === "number" ? value : value === undefined || value === null ? "" : String(value)}
            onChange={(e) => setLiteral(e.target.value === "" ? "" : Number(e.target.value))}
          />
        );
      case "select":
        return (
          <Select value={String(value ?? "")} onValueChange={(v) => setLiteral(v)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(def.options ?? []).map((o) => (
                <SelectItem key={String(o.value)} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "color":
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-8 w-10 rounded-md border border-input bg-background p-1"
              value={typeof value === "string" ? value : "#ffffff"}
              onChange={(e) => setLiteral(e.target.value)}
            />
            <Input
              className="h-8"
              value={typeof value === "string" ? value : ""}
              onChange={(e) => setLiteral(e.target.value)}
              placeholder="#ffffff"
            />
          </div>
        );
      case "json":
        return (
          <Textarea
            className="min-h-[100px] font-mono text-xs"
            value={typeof value === "string" ? value : safeStringify(value)}
            onChange={(e) => {
              const text = e.target.value;
              try {
                onChange(JSON.parse(text));
              } catch {
                onChange(text);
              }
            }}
          />
        );
      case "code":
        return (
          <Textarea
            className="min-h-[100px] font-mono text-xs"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setLiteral(e.target.value)}
          />
        );
      case "string":
      default:
        return (
          <Input
            className="h-8"
            value={typeof value === "string" ? value : value === undefined || value === null ? "" : String(value)}
            onChange={(e) => setLiteral(e.target.value)}
          />
        );
    }
  })();

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{def.label}</Label>
        {bindable && (
          <Button
            type="button"
            variant={js ? "secondary" : "ghost"}
            size="sm"
            className="h-6 gap-1 px-1.5 text-[10px]"
            onClick={toggleJs}
            title={js ? "Binding (JS) — click for literal" : "Literal — click to bind"}
          >
            {js ? <Code className="h-3 w-3" /> : <Braces className="h-3 w-3" />}
            JS
          </Button>
        )}
      </div>
      {js ? (
        <Input
          className="h-8 font-mono text-xs"
          value={innerExpr(value)}
          placeholder="queries.users.data"
          onChange={(e) => setExpr(e.target.value)}
        />
      ) : (
        literalInput
      )}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      {def.description && <p className="text-[10px] text-muted-foreground">{def.description}</p>}
    </div>
  );
}

function safeStringify(v: unknown): string {
  if (v === undefined || v === null) return "";
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

const ACTION_TYPES: { type: EventAction["type"]; label: string }[] = [
  { type: "runQuery", label: "Run query" },
  { type: "setValue", label: "Set value" },
  { type: "showAlert", label: "Show alert" },
  { type: "navigate", label: "Navigate" },
  { type: "openModal", label: "Open modal" },
  { type: "closeModal", label: "Close modal" },
];

function defaultAction(type: EventAction["type"]): EventAction {
  switch (type) {
    case "runQuery":
      return { type: "runQuery", queryId: "" };
    case "setValue":
      return { type: "setValue", componentId: "", property: "value", value: "" };
    case "showAlert":
      return { type: "showAlert", message: "", variant: "info" };
    case "navigate":
      return { type: "navigate", pageId: "" };
    case "openModal":
      return { type: "openModal", componentId: "" };
    case "closeModal":
      return { type: "closeModal", componentId: "" };
  }
}

function ActionEditor({
  action,
  components,
  queries,
  pages,
  onChange,
  onRemove,
}: {
  action: EventAction;
  components: ComponentNode[];
  queries: { id: string; name: string }[];
  pages: { id: string; name: string }[];
  onChange: (a: EventAction) => void;
  onRemove: () => void;
}) {
  const compSelect = (value: string, onChange: (v: string) => void) => (
    <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger className="h-8">
        <SelectValue placeholder="Select component" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">None</SelectItem>
        {components.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{ACTION_TYPES.find((a) => a.type === action.type)?.label}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {action.type === "runQuery" && (
        <Select value={action.queryId || "__none__"} onValueChange={(v) => onChange({ ...action, queryId: v === "__none__" ? "" : v })}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select query" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {queries.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                {q.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {action.type === "setValue" && (
        <>
          {compSelect(action.componentId, (v) => onChange({ ...action, componentId: v }))}
          <Input
            className="h-8"
            placeholder="property (e.g. value)"
            value={action.property}
            onChange={(e) => onChange({ ...action, property: e.target.value })}
          />
          <Input
            className="h-8 font-mono text-xs"
            placeholder="value or {{components.x.value}}"
            value={action.value}
            onChange={(e) => onChange({ ...action, value: e.target.value })}
          />
        </>
      )}
      {action.type === "showAlert" && (
        <>
          <Input
            className="h-8"
            placeholder="Message"
            value={action.message}
            onChange={(e) => onChange({ ...action, message: e.target.value })}
          />
          <Select value={action.variant} onValueChange={(v) => onChange({ ...action, variant: v as "info" | "success" | "warning" | "error" })}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
      {action.type === "navigate" && (
        <Select value={action.pageId || "__none__"} onValueChange={(v) => onChange({ ...action, pageId: v === "__none__" ? "" : v })}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {pages.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {(action.type === "openModal" || action.type === "closeModal") &&
        compSelect(action.componentId, (v) => onChange({ ...action, componentId: v }))}
    </div>
  );
}

function EventEditorDialog({
  eventType,
  event,
  components,
  queries,
  pages,
  open,
  onOpenChange,
  onSave,
}: {
  eventType: string;
  event: Event | undefined;
  components: ComponentNode[];
  queries: { id: string; name: string }[];
  pages: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (actions: EventAction[]) => void;
}) {
  const [actions, setActions] = useState<EventAction[]>(event?.actions ?? []);
  const [addType, setAddType] = useState<EventAction["type"]>("runQuery");

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit event: {eventType}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {actions.length === 0 && (
            <p className="text-xs text-muted-foreground">No actions yet. Add one below.</p>
          )}
          {actions.map((a, i) => (
            <ActionEditor
              key={i}
              action={a}
              components={components}
              queries={queries}
              pages={pages}
              onChange={(na) => setActions((prev) => prev.map((x, idx) => (idx === i ? na : x)))}
              onRemove={() => setActions((prev) => prev.filter((_, idx) => idx !== i))}
            />
          ))}
          <div className="flex items-center gap-2 pt-2">
            <Select value={addType} onValueChange={(v) => setAddType(v as EventAction["type"])}>
              <SelectTrigger className="h-8 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((a) => (
                  <SelectItem key={a.type} value={a.type}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActions((prev) => [...prev, defaultAction(addType)])}
            >
              <Plus />
              Add action
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(actions);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Inspector({ store, engine }: { store: EditorStore; engine: EngineState | null }) {
  const definition = useEditorStore(store, (s) => s.definition);
  const currentPageId = useEditorStore(store, (s) => s.currentPageId);
  const selectedComponentId = useEditorStore(store, (s) => s.selectedComponentId);

  // Re-render when engine binding errors change. The engine is only set in
  // edit mode after the Runtime mounts; before that it's null.
  const [, forceEngine] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!engine) return;
    return engine.subscribe(() => forceEngine());
  }, [engine]);

  const page = definition.pages.find((p) => p.id === currentPageId) ?? null;
  const allComponents = useMemo(
    () => (page ? flattenComponents(asNodes(page.components)) : []),
    [page],
  );
  const node = useMemo(
    () => (selectedComponentId ? allComponents.find((c) => c.id === selectedComponentId) : undefined),
    [allComponents, selectedComponentId],
  );
  const def = node ? getComponentDefinition(node.type) : undefined;

  const [editingEvent, setEditingEvent] = useState<string | null>(null);

  if (!node || !def || !page) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Select a component to edit its properties.</div>
    );
  }

  const queries = page.queries.map((q) => ({ id: q.id, name: q.name }));
  const pages = definition.pages.map((p) => ({ id: p.id, name: p.name }));

  function setProp(name: string, value: unknown) {
    store.getState().updateComponentProps(node!.id, { [name]: value });
  }

  function propError(propName: string): string | undefined {
    if (!engine) return undefined;
    return engine.errors[`${node!.id}.${propName}`];
  }

  const currentEvent = editingEvent
    ? node.events.find((e) => e.type === editingEvent)
    : undefined;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input
            className="h-8"
            value={node.name}
            onChange={(e) => store.getState().renameComponent(node.id, e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground">id: {node.id}</p>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Properties</h3>
          {def.props.map((p) => (
            <PropField
              key={p.name}
              def={p}
              value={node.props[p.name]}
              onChange={(v) => setProp(p.name, v)}
              error={propError(p.name)}
            />
          ))}
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layout</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Width</Label>
              <Select
                value={node.layout.width}
                onValueChange={(v) =>
                  store.getState().updateComponentLayout(node.id, { width: v as ComponentNode["layout"]["width"] })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="grow">Grow</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Align</Label>
              <Select
                value={node.layout.align}
                onValueChange={(v) =>
                  store.getState().updateComponentLayout(node.id, { align: v as ComponentNode["layout"]["align"] })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stretch">Stretch</SelectItem>
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="end">End</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {def.events && def.events.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Events</h3>
              {def.events.map((evt) => {
                const existing = node.events.find((e) => e.type === evt);
                return (
                  <div
                    key={evt}
                    className="flex items-center justify-between rounded-md border px-2 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{evt}</span>
                      {existing && (
                        <span className="text-[10px] text-muted-foreground">
                          {existing.actions.length} action{existing.actions.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="h-7" onClick={() => setEditingEvent(evt)}>
                      Edit
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <Separator />

        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => store.getState().removeComponent(node.id)}
        >
          <Trash2 />
          Delete component
        </Button>
      </div>

      {editingEvent && (
        <EventEditorDialog
          eventType={editingEvent}
          event={currentEvent}
          components={allComponents}
          queries={queries}
          pages={pages}
          open={editingEvent !== null}
          onOpenChange={(o) => !o && setEditingEvent(null)}
          onSave={(actions) => {
            const others = node.events.filter((e) => e.type !== editingEvent);
            const newEvents: Event[] = actions.length > 0 ? [...others, { type: editingEvent, actions }] : others;
            store.getState().updateComponentEvents(node.id, newEvents);
          }}
        />
      )}
    </ScrollArea>
  );
}
