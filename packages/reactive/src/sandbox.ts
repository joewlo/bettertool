import vm from "node:vm";
import type { QuickJSContext } from "quickjs-emscripten";
import type { BindingResult, BindingValue } from "./types.js";

export interface Sandbox {
  evalExpression(expr: string, scope: object): Promise<BindingResult>;
  evalTemplate(
    parts: Array<string | { expr: string }>,
    scope: object,
  ): Promise<BindingResult>;
  evalBinding(binding: BindingValue, scope: object): Promise<BindingResult>;
  dispose(): void;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function makeObjectHandler(path: string, deps: Set<string>): ProxyHandler<Record<PropertyKey, unknown>> {
  const NOISE = new Set(["constructor", "prototype", "__proto__"]);
  return {
    get(target, prop, receiver) {
      if (typeof prop === "symbol") {
        return Reflect.get(target, prop, receiver);
      }
      const key = String(prop);
      const childPath = path === "" ? key : `${path}.${key}`;
      if (!NOISE.has(key)) {
        deps.add(childPath);
      }
      const childValue = Reflect.get(target, prop, receiver);
      return wrapValue(childValue, childPath, deps);
    },
    has(target, prop) {
      return Reflect.has(target, prop);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  };
}

function wrapValue(value: unknown, path: string, deps: Set<string>): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  return new Proxy(value as Record<PropertyKey, unknown>, makeObjectHandler(path, deps));
}

function wrapScope(scope: object, deps: Set<string>): Record<string, unknown> {
  return new Proxy(scope as Record<PropertyKey, unknown>, makeObjectHandler("", deps));
}

export function createSandbox(): Sandbox {
  // QuickJS is installed and wired as the sandbox type, but for v1 we evaluate
  // expressions in the host `node:vm` so we can track dependencies via a Proxy
  // on the scope. QuickJS cannot observe host-side property reads across the
  // WASM boundary, which breaks dependency tracking. The host vm runs in a
  // fresh context with no require/process/global access and a 500ms timeout.
  // TODO: switch eval to QuickJS once dep-tracking across the WASM boundary
  // is solved (e.g. by source-rewriting reads to call a tracker).
  let quickVm: QuickJSContext | null = null;

  function evalExpressionSync(expr: string, scope: object): BindingResult {
    const deps = new Set<string>();
    if (expr.trim() === "") {
      return { value: undefined, error: null, dependencies: [] };
    }
    const proxied = wrapScope(scope, deps);
    try {
      const value = vm.runInNewContext(expr, proxied, {
        timeout: 500,
        filename: "binding.vm.js",
        displayErrors: true,
      });
      return { value, error: null, dependencies: [...deps] };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { value: undefined, error: message, dependencies: [...deps] };
    }
  }

  async function evalExpression(
    expr: string,
    scope: object,
  ): Promise<BindingResult> {
    return evalExpressionSync(expr, scope);
  }

  async function evalTemplate(
    parts: Array<string | { expr: string }>,
    scope: object,
  ): Promise<BindingResult> {
    const allDeps = new Set<string>();
    const pieces: string[] = [];
    let error: string | null = null;
    for (const part of parts) {
      if (typeof part === "string") {
        pieces.push(part);
        continue;
      }
      const r = evalExpressionSync(part.expr, scope);
      for (const d of r.dependencies) allDeps.add(d);
      if (r.error) {
        error = r.error;
        break;
      }
      pieces.push(stringify(r.value));
    }
    return { value: pieces.join(""), error, dependencies: [...allDeps] };
  }

  async function evalBinding(
    binding: BindingValue,
    scope: object,
  ): Promise<BindingResult> {
    if (binding.kind === "literal") {
      return { value: binding.value, error: null, dependencies: [] };
    }
    if (binding.kind === "expr") {
      return evalExpression(binding.expr, scope);
    }
    return evalTemplate(binding.parts, scope);
  }

  function dispose(): void {
    if (quickVm) {
      try {
        quickVm.dispose();
      } catch {
        // ignore dispose errors during teardown
      }
      quickVm = null;
    }
  }

  return { evalExpression, evalTemplate, evalBinding, dispose };
}
