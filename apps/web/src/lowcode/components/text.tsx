import type { ComponentNode } from "@bettertool/shared";
import { isBindableString } from "@bettertool/reactive";

import { cn } from "@/lib/utils";
import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";

const variantClass: Record<string, string> = {
  plain: "text-base",
  h1: "scroll-m-20 text-3xl font-extrabold tracking-tight",
  h2: "scroll-m-20 text-2xl font-semibold tracking-tight",
  h3: "scroll-m-20 text-xl font-semibold tracking-tight",
  muted: "text-base text-muted-foreground",
};

const alignClass: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

registerComponent({
  type: "text",
  displayName: "Text",
  category: "display",
  defaultProps: { text: "Text", variant: "plain", align: "left" },
  defaultLayout: { width: "grow", align: "stretch" },
  props: [
    {
      name: "text",
      label: "Text",
      type: "string",
      default: "Text",
      bindable: true,
      description: 'Supports templates like "Hello {{components.name.value}}"',
    },
    {
      name: "variant",
      label: "Variant",
      type: "select",
      default: "plain",
      options: [
        { label: "Plain", value: "plain" },
        { label: "Heading 1", value: "h1" },
        { label: "Heading 2", value: "h2" },
        { label: "Heading 3", value: "h3" },
        { label: "Muted", value: "muted" },
      ],
    },
    {
      name: "align",
      label: "Align",
      type: "select",
      default: "left",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
  ],
  render: ({ node, resolved }) => {
    const raw = node.props.text;
    const isBound = isBindableString(raw);
    const resolvedText = resolved.text;
    // Bound templates that resolve to undefined/null (e.g. while a query is
    // loading) render an em-dash placeholder instead of flashing "undefined".
    // Literal text is always stringified as-is.
    const text =
      isBound && (resolvedText === undefined || resolvedText === null)
        ? "—"
        : resolvedText === undefined || resolvedText === null
          ? ""
          : String(resolvedText);
    const variant = (resolved.variant as string) ?? "plain";
    const align = (resolved.align as string) ?? "left";
    const cls = cn(variantClass[variant] ?? variantClass.plain, alignClass[align] ?? alignClass.left);
    if (variant === "h1") return <h1 className={cls}>{text}</h1>;
    if (variant === "h2") return <h2 className={cls}>{text}</h2>;
    if (variant === "h3") return <h3 className={cls}>{text}</h3>;
    if (variant === "muted") return <p className={cls}>{text}</p>;
    return <span className={cls}>{text}</span>;
  },
});

export type TextComponent = ComponentNode;
