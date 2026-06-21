import { useEffect, useRef, useState } from "react";
import { Braces, ChevronRight, Loader2, Play } from "lucide-react";

import type { GraphqlQuery } from "@bettertool/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyValueEditor } from "@/components/ui/key-value-editor";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  extractSchema,
  useIntrospectGraphql,
  useRunGraphqlQuery,
  type GraphqlField,
  type GraphqlSchema,
  type GraphqlType,
  type GraphqlTypeRef,
} from "@/lib/queries";

interface GraphqlQueryEditorProps {
  resourceId: string;
  query: GraphqlQuery;
  onChange: (query: GraphqlQuery) => void;
}

const schemaCache = new Map<string, GraphqlSchema>();

const BUILTIN_SCALARS = new Set(["String", "Int", "Float", "Boolean", "ID"]);

export function GraphqlQueryEditor({ resourceId, query, onChange }: GraphqlQueryEditorProps) {
  const runGraphqlQuery = useRunGraphqlQuery();
  const introspect = useIntrospectGraphql();
  const [showHeaders, setShowHeaders] = useState(false);
  const [showResponseHeaders, setShowResponseHeaders] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [schema, setSchema] = useState<GraphqlSchema | null>(() => schemaCache.get(resourceId) ?? null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const queryTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSchema(schemaCache.get(resourceId) ?? null);
    setSchemaError(null);
  }, [resourceId]);

  function patch(patch: Partial<GraphqlQuery>) {
    onChange({ ...query, ...patch });
  }

  async function handleRun() {
    try {
      await runGraphqlQuery.mutateAsync({ resourceId, query });
    } catch (err) {
      toast.error("Request failed", { description: (err as Error).message });
    }
  }

  async function handleFetchSchema() {
    setSchemaError(null);
    try {
      const res = await introspect.mutateAsync({ resourceId });
      const extracted = extractSchema(res.data);
      if (extracted) {
        schemaCache.set(resourceId, extracted);
        setSchema(extracted);
      } else {
        const errs = extractGraphqlErrors(res.data);
        setSchemaError(
          errs.length > 0
            ? `GraphQL errors: ${JSON.stringify(errs)}`
            : "No schema found in response (introspection may be disabled).",
        );
      }
    } catch (err) {
      setSchemaError((err as Error).message);
    }
  }

  function insertField(field: GraphqlField, isRootField: boolean) {
    const ta = queryTextareaRef.current;
    const current = query.query;
    const { text, cursorOffsetFromStart } = buildInsertText(field, isRootField);
    const start = ta ? ta.selectionStart : current.length;
    const end = ta ? ta.selectionEnd : current.length;
    const next = current.slice(0, start) + text + current.slice(end);
    patch({ query: next });
    const newPos =
      cursorOffsetFromStart !== null ? start + cursorOffsetFromStart : start + text.length;
    requestAnimationFrame(() => {
      const el = queryTextareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(newPos, newPos);
      }
    });
  }

  const response = runGraphqlQuery.data;
  const errors = extractGraphqlErrors(response?.data);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">GraphQL query</span>
        <div className="flex items-center gap-2">
          <Button
            variant={showSchema ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSchema((s) => !s)}
          >
            <Braces />
            Schema
          </Button>
          <Button onClick={handleRun} disabled={runGraphqlQuery.isPending}>
            <Play />
            {runGraphqlQuery.isPending ? "Running..." : "Run"}
          </Button>
        </div>
      </div>

      <div className={showSchema ? "flex items-start gap-3" : ""}>
        <div className={showSchema ? "min-w-0 flex-1 space-y-3" : "space-y-3"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Query</label>
              <Textarea
                ref={queryTextareaRef}
                className="min-h-[300px] font-mono text-xs"
                value={query.query}
                onChange={(e) => patch({ query: e.target.value })}
                placeholder={"query MyQuery {\n  users {\n    id\n    name\n  }\n}"}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Variables (JSON)</label>
              <Textarea
                className="min-h-[300px] font-mono text-xs"
                value={query.variables}
                onChange={(e) => patch({ variables: e.target.value })}
                placeholder='{ "limit": 10 }'
              />
            </div>
          </div>

          <div>
            <button
              type="button"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowHeaders((s) => !s)}
            >
              {showHeaders ? "▾" : "▸"} Headers{" "}
              {Object.keys(query.headers).length > 0 && `(${Object.keys(query.headers).length})`}
            </button>
            {showHeaders && (
              <div className="mt-2">
                <KeyValueEditor
                  value={query.headers}
                  onChange={(headers) => patch({ headers })}
                  keyPlaceholder="Header name"
                  valuePlaceholder="Header value"
                />
              </div>
            )}
          </div>
        </div>

        {showSchema && (
          <div className="w-[300px] shrink-0">
            <SchemaExplorer
              schema={schema}
              isLoading={introspect.isPending}
              error={schemaError}
              onFetch={handleFetchSchema}
              onInsertField={insertField}
            />
          </div>
        )}
      </div>

      {response && (
        <div className="space-y-3 rounded-md border bg-background p-3">
          <div className="flex items-center gap-3">
            <ResponseStatus status={response.status} />
            <span className="text-sm text-muted-foreground">{response.durationMs}ms</span>
            {response.truncated && (
              <Badge variant="warning">Response truncated (5MB limit)</Badge>
            )}
          </div>

          {errors.length > 0 && (
            <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-2">
              <p className="text-xs font-semibold text-destructive">GraphQL errors</p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-destructive/5 p-2 font-mono text-xs text-destructive">
                {JSON.stringify(errors, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <button
              type="button"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowResponseHeaders((s) => !s)}
            >
              {showResponseHeaders ? "▾" : "▸"} Response headers ({Object.keys(response.headers).length})
            </button>
            {showResponseHeaders && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs">
                {Object.entries(response.headers)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n")}
              </pre>
            )}
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">Response body</p>
            <pre className="max-h-[400px] overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs">
              {formatBody(response.data)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

interface SchemaExplorerProps {
  schema: GraphqlSchema | null;
  isLoading: boolean;
  error: string | null;
  onFetch: () => void;
  onInsertField: (field: GraphqlField, isRootField: boolean) => void;
}

function SchemaExplorer({ schema, isLoading, error, onFetch, onInsertField }: SchemaExplorerProps) {
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="flex h-[460px] flex-col items-center justify-center gap-2 rounded-md border bg-background p-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Fetching schema...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[460px] flex-col gap-2 rounded-md border bg-background p-3 text-sm">
        <p className="font-medium text-destructive">Failed to load schema</p>
        <p className="line-clamp-6 text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={onFetch} className="self-start">
          Retry
        </Button>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="flex h-[460px] flex-col items-center justify-center gap-2 rounded-md border bg-background p-3 text-center text-sm text-muted-foreground">
        <p>No schema loaded.</p>
        <Button variant="outline" size="sm" onClick={onFetch}>
          Fetch schema
        </Button>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const rootNames = new Set<string>();
  if (schema.queryType?.name) rootNames.add(schema.queryType.name);
  if (schema.mutationType?.name) rootNames.add(schema.mutationType.name);
  if (schema.subscriptionType?.name) rootNames.add(schema.subscriptionType.name);

  const queryFields = filterFields(getRootFields(schema, schema.queryType?.name), q);
  const mutationFields = filterFields(getRootFields(schema, schema.mutationType?.name), q);
  const subscriptionFields = filterFields(getRootFields(schema, schema.subscriptionType?.name), q);

  const objectTypes = schema.types.filter(
    (t) =>
      (t.kind === "OBJECT" || t.kind === "INTERFACE" || t.kind === "UNION") &&
      !isBuiltin(t.name) &&
      !rootNames.has(t.name ?? ""),
  );
  const enumTypes = schema.types.filter((t) => t.kind === "ENUM" && !isBuiltin(t.name));
  const inputTypes = schema.types.filter((t) => t.kind === "INPUT_OBJECT" && !isBuiltin(t.name));

  const filteredObjects = q ? objectTypes.filter((t) => typeMatches(t, q)) : objectTypes;
  const filteredEnums = q ? enumTypes.filter((t) => typeMatches(t, q)) : enumTypes;
  const filteredInputs = q ? inputTypes.filter((t) => typeMatches(t, q)) : inputTypes;

  const forceOpen = q.length > 0;

  return (
    <div className="flex h-[460px] flex-col rounded-md border bg-background">
      <div className="sticky top-0 z-10 border-b bg-background p-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search schema..."
          className="h-8 text-xs"
        />
      </div>
      <div className="flex-1 space-y-1 overflow-auto p-2">
        <GroupSection title="Queries" count={queryFields.length} defaultOpen forceOpen={forceOpen}>
          {queryFields.map((f) => (
            <FieldRow key={f.name} field={f} isRootField onInsert={onInsertField} />
          ))}
        </GroupSection>
        <GroupSection title="Mutations" count={mutationFields.length} forceOpen={forceOpen}>
          {mutationFields.map((f) => (
            <FieldRow key={f.name} field={f} isRootField onInsert={onInsertField} />
          ))}
        </GroupSection>
        <GroupSection title="Subscriptions" count={subscriptionFields.length} forceOpen={forceOpen}>
          {subscriptionFields.map((f) => (
            <FieldRow key={f.name} field={f} isRootField onInsert={onInsertField} />
          ))}
        </GroupSection>
        <GroupSection title="Types" count={filteredObjects.length} forceOpen={forceOpen}>
          {filteredObjects.map((t) => (
            <TypeRow key={t.name} type={t} onInsert={onInsertField} />
          ))}
        </GroupSection>
        <GroupSection title="Enums" count={filteredEnums.length} forceOpen={forceOpen}>
          {filteredEnums.map((t) => (
            <EnumRow key={t.name} type={t} />
          ))}
        </GroupSection>
        <GroupSection title="Input Objects" count={filteredInputs.length} forceOpen={forceOpen}>
          {filteredInputs.map((t) => (
            <InputTypeRow key={t.name} type={t} />
          ))}
        </GroupSection>
      </div>
    </div>
  );
}

function GroupSection({
  title,
  count,
  defaultOpen,
  forceOpen,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  if (count === 0) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-xs font-semibold hover:bg-accent"
      >
        <ChevronRight className={cn("size-3 transition-transform", isOpen && "rotate-90")} />
        {title} <span className="font-normal text-muted-foreground">({count})</span>
      </button>
      {isOpen && <div className="ml-2 mt-1 space-y-0.5 border-l border-border pl-2">{children}</div>}
    </div>
  );
}

function FieldRow({
  field,
  isRootField,
  onInsert,
}: {
  field: GraphqlField;
  isRootField: boolean;
  onInsert: (field: GraphqlField, isRootField: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onInsert(field, isRootField)}
      className="block w-full rounded px-1 py-0.5 text-left hover:bg-accent"
      title={field.description ?? undefined}
    >
      <span className="font-mono text-[11px]">
        <span className="text-foreground">{field.name}</span>
        {field.args.length > 0 && (
          <span className="text-muted-foreground">
            ({field.args.map((a) => `${a.name}: ${formatType(a.type)}`).join(", ")})
          </span>
        )}
        <span className="text-muted-foreground">: {formatType(field.type)}</span>
      </span>
      {field.description && (
        <p className="truncate text-[10px] text-muted-foreground">{field.description}</p>
      )}
    </button>
  );
}

function TypeRow({
  type,
  onInsert,
}: {
  type: GraphqlType;
  onInsert: (field: GraphqlField, isRootField: boolean) => void;
}) {
  const fields = type.fields ?? [];
  return (
    <CollapsibleType name={type.name} description={type.description} count={fields.length}>
      {fields.map((f) => (
        <FieldRow key={f.name} field={f} isRootField={false} onInsert={onInsert} />
      ))}
    </CollapsibleType>
  );
}

function InputTypeRow({ type }: { type: GraphqlType }) {
  const fields = type.inputFields ?? [];
  return (
    <CollapsibleType name={type.name} description={type.description} count={fields.length}>
      {fields.map((f) => (
        <InputFieldRow key={f.name} field={f} />
      ))}
    </CollapsibleType>
  );
}

function InputFieldRow({ field }: { field: GraphqlField & { defaultValue?: string | null } }) {
  return (
    <div className="px-1 py-0.5" title={field.description ?? undefined}>
      <span className="font-mono text-[11px]">
        <span className="text-foreground">{field.name}</span>
        <span className="text-muted-foreground">: {formatType(field.type)}</span>
        {field.defaultValue != null && field.defaultValue !== "" && (
          <span className="text-muted-foreground"> = {field.defaultValue}</span>
        )}
      </span>
      {field.description && (
        <p className="truncate text-[10px] text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}

function EnumRow({ type }: { type: GraphqlType }) {
  const values = type.enumValues ?? [];
  return (
    <CollapsibleType name={type.name} description={type.description} count={values.length}>
      {values.map((v) => (
        <div key={v.name} className="px-1 py-0.5" title={v.description ?? undefined}>
          <span className="font-mono text-[11px] text-foreground">{v.name}</span>
          {v.description && (
            <p className="truncate text-[10px] text-muted-foreground">{v.description}</p>
          )}
        </div>
      ))}
    </CollapsibleType>
  );
}

function CollapsibleType({
  name,
  description,
  count,
  children,
}: {
  name: string | null;
  description?: string | null;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-accent"
        title={description ?? undefined}
      >
        <ChevronRight className={cn("size-3 shrink-0 transition-transform", open && "rotate-90")} />
        <span className="truncate font-mono text-[11px] font-medium text-foreground">{name}</span>
        <span className="text-[10px] text-muted-foreground">({count})</span>
      </button>
      {open && <div className="ml-2 mt-0.5 space-y-0.5 border-l border-border pl-2">{children}</div>}
    </div>
  );
}

function ResponseStatus({ status }: { status: number }) {
  const variant =
    status >= 200 && status < 300
      ? "success"
      : status >= 300 && status < 400
        ? "warning"
        : "destructive";
  return (
    <Badge variant={variant} className="font-mono">
      {status}
    </Badge>
  );
}

function getRootFields(schema: GraphqlSchema, rootName: string | null | undefined): GraphqlField[] {
  if (!rootName) return [];
  const t = schema.types.find((ty) => ty.name === rootName);
  return t?.fields ?? [];
}

function filterFields(fields: GraphqlField[], q: string): GraphqlField[] {
  if (!q) return fields;
  return fields.filter((f) => f.name.toLowerCase().includes(q));
}

function typeMatches(type: GraphqlType, q: string): boolean {
  if (!q) return true;
  if (type.name?.toLowerCase().includes(q)) return true;
  const fields = type.fields ?? type.inputFields ?? type.enumValues ?? [];
  return fields.some((f) => f.name?.toLowerCase().includes(q));
}

function isBuiltin(name: string | null): boolean {
  if (!name) return false;
  return BUILTIN_SCALARS.has(name) || name.startsWith("__");
}

function isObjectLike(typeRef: GraphqlTypeRef): boolean {
  let t: GraphqlTypeRef | null | undefined = typeRef;
  while (t && (t.kind === "NON_NULL" || t.kind === "LIST")) {
    t = t.ofType;
  }
  return !!t && (t.kind === "OBJECT" || t.kind === "INTERFACE" || t.kind === "UNION");
}

function formatType(typeRef: GraphqlTypeRef): string {
  if (typeRef.kind === "NON_NULL") {
    return `${formatType(typeRef.ofType!)}!`;
  }
  if (typeRef.kind === "LIST") {
    return `[${formatType(typeRef.ofType!)}]`;
  }
  return typeRef.name ?? typeRef.kind;
}

function buildInsertText(
  field: GraphqlField,
  isRootField: boolean,
): { text: string; cursorOffsetFromStart: number | null } {
  const prefix = isRootField ? "\n  " : "";
  const name = field.name;
  if (isObjectLike(field.type)) {
    const text = `${prefix}${name} {\n    \n  }`;
    const cursorOffsetFromStart = `${prefix}${name} {\n    `.length;
    return { text, cursorOffsetFromStart };
  }
  return { text: `${prefix}${name}`, cursorOffsetFromStart: null };
}

function extractGraphqlErrors(data: unknown): unknown[] {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const maybeErrors = (data as Record<string, unknown>).errors;
    if (Array.isArray(maybeErrors)) {
      return maybeErrors;
    }
  }
  return [];
}

function formatBody(data: unknown): string {
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}
