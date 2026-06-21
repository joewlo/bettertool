export interface ModelSnapshot {
  queries: Record<string, QueryState>;
  components: Record<string, ComponentState>;
  globals: Record<string, unknown>;
}

export interface QueryState {
  data: unknown;
  isFetching: boolean;
  error: string | null;
  lastRun: number | null;
}

export interface ComponentState {
  [property: string]: unknown;
}

export interface BindingResult {
  value: unknown;
  error: string | null;
  dependencies: string[];
}

export type BindingValue =
  | { kind: "literal"; value: unknown }
  | { kind: "expr"; expr: string }
  | { kind: "template"; parts: Array<string | { expr: string }> };
