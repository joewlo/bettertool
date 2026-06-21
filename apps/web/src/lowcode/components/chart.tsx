import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Loader2 } from "lucide-react";

import { registerComponent } from "../registry";
import type { ComponentDefinition } from "../types";

type ChartType = "line" | "bar" | "bar-horizontal" | "area" | "pie" | "scatter";

interface YKey {
  key: string;
  name?: string;
  color?: string;
}

const DEFAULT_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function defaultColor(i: number): string {
  return DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]!;
}

function parseYKeys(raw: unknown): YKey[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is YKey => c !== null && typeof c === "object" && "key" in c)
    .map((c) => ({
      key: String((c as YKey).key),
      name: (c as YKey).name,
      color: (c as YKey).color,
    }));
}

function parseRows(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((r) => r !== null && typeof r === "object");
}

registerComponent({
  type: "chart",
  displayName: "Chart",
  category: "chart",
  defaultProps: {
    chartType: "line",
    data: [] as Record<string, unknown>[],
    xKey: "x",
    yKeys: [{ key: "y", name: "Y" }],
    height: 300,
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    xAxisLabel: "",
    yAxisLabel: "",
  },
  defaultLayout: { width: "full", align: "stretch" },
  props: [
    {
      name: "chartType",
      label: "Chart Type",
      type: "select",
      default: "line",
      options: [
        { label: "Line", value: "line" },
        { label: "Bar", value: "bar" },
        { label: "Bar Horizontal", value: "bar-horizontal" },
        { label: "Area", value: "area" },
        { label: "Pie", value: "pie" },
        { label: "Scatter", value: "scatter" },
      ],
    },
    {
      name: "data",
      label: "Data",
      type: "json",
      default: [],
      bindable: true,
      description: "Array of objects. Bind to {{queries.<name>.data}}.",
    },
    { name: "xKey", label: "X Key", type: "string", default: "x" },
    {
      name: "yKeys",
      label: "Y Series",
      type: "json",
      default: [{ key: "y", name: "Y" }],
      description: 'JSON array of {key, name?, color?}',
    },
    { name: "height", label: "Height", type: "number", default: 300 },
    { name: "showGrid", label: "Show Grid", type: "boolean", default: true },
    { name: "showLegend", label: "Show Legend", type: "boolean", default: true },
    { name: "showTooltip", label: "Show Tooltip", type: "boolean", default: true },
    { name: "xAxisLabel", label: "X Axis Label", type: "string", default: "" },
    { name: "yAxisLabel", label: "Y Axis Label", type: "string", default: "" },
  ],
  render: ({ resolved }) => {
    const chartType = (resolved.chartType as ChartType) ?? "line";
    const dataRaw = resolved.data;
    const data = useMemo(() => parseRows(dataRaw), [dataRaw]);
    const yKeys = useMemo(() => parseYKeys(resolved.yKeys), [resolved.yKeys]);
    const xKey = (resolved.xKey as string) ?? "x";
    const height = (resolved.height as number) ?? 300;
    const showGrid = resolved.showGrid !== false;
    const showLegend = resolved.showLegend !== false;
    const showTooltip = resolved.showTooltip !== false;
    const xAxisLabel = (resolved.xAxisLabel as string) ?? "";
    const yAxisLabel = (resolved.yAxisLabel as string) ?? "";

    const isLoading = dataRaw === undefined;

    if (isLoading) {
      return (
        <div
          className="flex items-center justify-center rounded-md border text-sm text-muted-foreground"
          style={{ height }}
        >
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </span>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div
          className="flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
          style={{ height }}
        >
          No data
        </div>
      );
    }

    const axisProps = {
      dataKey: xKey,
      type: "category" as const,
      tick: { fontSize: 12 },
    };

    const numericAxisProps = {
      tick: { fontSize: 12 },
    };

    let chart: React.ReactNode = null;

    if (chartType === "pie") {
      const valueYKey = yKeys[0];
      const colorPalette = yKeys.map((y, i) => y.color ?? defaultColor(i));
      chart = (
        <PieChart>
          {showLegend && <Legend />}
          {showTooltip && <Tooltip />}
          <Pie
            data={data}
            dataKey={valueYKey ? valueYKey.key : "y"}
            nameKey={xKey}
            outerRadius={Math.min(height, 320) / 2 - 8}
            label
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={colorPalette[i % colorPalette.length] ?? defaultColor(i)}
              />
            ))}
          </Pie>
        </PieChart>
      );
    } else if (chartType === "scatter") {
      chart = (
        <ScatterChart>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />}
          {showLegend && <Legend />}
          {showTooltip && <Tooltip />}
          <XAxis
            dataKey={xKey}
            type="number"
            name={xAxisLabel || xKey}
            tick={{ fontSize: 12 }}
            label={xAxisLabel ? xAxisLabel : undefined}
          />
          <YAxis
            type="number"
            tick={{ fontSize: 12 }}
            label={yAxisLabel ? yAxisLabel : undefined}
          />
          {yKeys.map((y, i) => (
            <Scatter
              key={y.key}
              name={y.name ?? y.key}
              data={data}
              fill={y.color ?? defaultColor(i)}
            />
          ))}
        </ScatterChart>
      );
    } else if (chartType === "bar-horizontal") {
      chart = (
        <BarChart data={data} layout="vertical">
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />}
          {showLegend && <Legend />}
          {showTooltip && <Tooltip />}
          <XAxis type="number" tick={{ fontSize: 12 }} label={xAxisLabel ? xAxisLabel : undefined} />
          <YAxis
            type="category"
            dataKey={xKey}
            tick={{ fontSize: 12 }}
            width={100}
            label={yAxisLabel ? yAxisLabel : undefined}
          />
          {yKeys.map((y, i) => (
            <Bar
              key={y.key}
              dataKey={y.key}
              name={y.name ?? y.key}
              fill={y.color ?? defaultColor(i)}
            />
          ))}
        </BarChart>
      );
    } else if (chartType === "bar") {
      chart = (
        <BarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />}
          {showLegend && <Legend />}
          {showTooltip && <Tooltip />}
          <XAxis
            {...axisProps}
            label={xAxisLabel ? xAxisLabel : undefined}
          />
          <YAxis
            {...numericAxisProps}
            label={yAxisLabel ? yAxisLabel : undefined}
          />
          {yKeys.map((y, i) => (
            <Bar
              key={y.key}
              dataKey={y.key}
              name={y.name ?? y.key}
              fill={y.color ?? defaultColor(i)}
            />
          ))}
        </BarChart>
      );
    } else if (chartType === "area") {
      chart = (
        <AreaChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />}
          {showLegend && <Legend />}
          {showTooltip && <Tooltip />}
          <XAxis {...axisProps} label={xAxisLabel ? xAxisLabel : undefined} />
          <YAxis
            {...numericAxisProps}
            label={yAxisLabel ? yAxisLabel : undefined}
          />
          {yKeys.map((y, i) => {
            const color = y.color ?? defaultColor(i);
            return (
              <Area
                key={y.key}
                type="monotone"
                dataKey={y.key}
                name={y.name ?? y.key}
                stroke={color}
                fill={color}
                fillOpacity={0.3}
              />
            );
          })}
        </AreaChart>
      );
    } else {
      // line
      chart = (
        <LineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />}
          {showLegend && <Legend />}
          {showTooltip && <Tooltip />}
          <XAxis {...axisProps} label={xAxisLabel ? xAxisLabel : undefined} />
          <YAxis
            {...numericAxisProps}
            label={yAxisLabel ? yAxisLabel : undefined}
          />
          {yKeys.map((y, i) => (
            <Line
              key={y.key}
              type="monotone"
              dataKey={y.key}
              name={y.name ?? y.key}
              stroke={y.color ?? defaultColor(i)}
              dot={false}
            />
          ))}
        </LineChart>
      );
    }

    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart}
        </ResponsiveContainer>
      </div>
    );
  },
});
