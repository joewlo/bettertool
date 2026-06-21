import type { BindingValue } from "./types.js";

export function isBindableString(raw: unknown): boolean {
  return typeof raw === "string" && raw.includes("{{");
}

export function parseBinding(raw: unknown): BindingValue {
  if (typeof raw !== "string") {
    return { kind: "literal", value: raw };
  }
  if (!raw.includes("{{")) {
    return { kind: "literal", value: raw };
  }

  const wholeMatch = raw.match(/^\s*{{([\s\S]*)}}\s*$/);
  if (wholeMatch && wholeMatch[1] !== undefined) {
    const expr = wholeMatch[1].trim();
    if (!expr.includes("{{")) {
      return { kind: "expr", expr };
    }
  }

  const parts: Array<string | { expr: string }> = [];
  const regex = /{{([\s\S]*?)}}/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    if (m.index > lastIndex) {
      parts.push(raw.slice(lastIndex, m.index));
    }
    const exprStr = m[1] ?? "";
    parts.push({ expr: exprStr.trim() });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < raw.length) {
    parts.push(raw.slice(lastIndex));
  }
  return { kind: "template", parts };
}
