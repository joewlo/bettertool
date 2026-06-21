import { useState } from "react";
import { Plus, Trash2, Variable } from "lucide-react";

import type { VariableDef } from "@bettertool/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { useEditorStore, type EditorStore } from "./editor-store";

export function VariablesPanel({ store }: { store: EditorStore }) {
  const definition = useEditorStore(store, (s) => s.definition);
  const currentPageId = useEditorStore(store, (s) => s.currentPageId);

  const page = definition.pages.find((p) => p.id === currentPageId) ?? null;
  const variables = (page?.variables ?? []) as VariableDef[];

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<VariableDef["type"]>("string");

  function addVariable() {
    const name = newName.trim();
    if (!name || !page) return;
    const id = crypto.randomUUID();
    store.getState().updatePageVariables(page.id, [
      ...variables,
      { id, name, type: newType, defaultValue: "" },
    ]);
    setNewName("");
    setNewType("string");
    setAdding(false);
  }

  function updateVariable(id: string, patch: Partial<VariableDef>) {
    if (!page) return;
    store
      .getState()
      .updatePageVariables(
        page.id,
        variables.map((v) => (v.id === id ? { ...v, ...patch } : v)),
      );
  }

  function removeVariable(id: string) {
    if (!page) return;
    store.getState().updatePageVariables(
      page.id,
      variables.filter((v) => v.id !== id),
    );
  }

  if (!page) return null;

  return (
    <div className="shrink-0 border-t">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Variable className="h-3.5 w-3.5" />
          Variables
        </div>
        {!adding && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        )}
      </div>

      {adding && (
        <div className="space-y-2 px-3 pb-2">
          <div className="flex gap-1.5">
            <Input
              className="h-7 flex-1 text-xs"
              placeholder="variableName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addVariable();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewName("");
                }
              }}
              autoFocus
            />
            <Select value={newType} onValueChange={(v) => setNewType(v as VariableDef["type"])}>
              <SelectTrigger className="h-7 w-[72px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">str</SelectItem>
                <SelectItem value="number">num</SelectItem>
                <SelectItem value="boolean">bool</SelectItem>
                <SelectItem value="json">json</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" className="h-6 flex-1 text-[10px]" onClick={addVariable}>
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px]"
              onClick={() => {
                setAdding(false);
                setNewName("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {variables.length > 0 && (
        <div className="space-y-0.5 px-3 pb-2">
          {variables.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 transition-colors hover:border-border hover:bg-muted/30"
            >
              <span className="min-w-0 flex-1 font-mono text-[11px] font-medium">
                {v.name}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{v.type}</span>
              <Input
                className="h-6 w-20 text-[11px] font-mono"
                value={v.defaultValue}
                placeholder="default"
                onChange={(e) => updateVariable(v.id, { defaultValue: e.target.value })}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeVariable(v.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {variables.length > 0 && (
        <div className="px-3 pb-2">
          <p className="text-[10px] text-muted-foreground">
            Bind with <code className="rounded bg-muted px-0.5 text-[9px]">{`{{variables.name}}`}</code> or set via &ldquo;Set variable&rdquo; event action.
          </p>
        </div>
      )}
    </div>
  );
}
