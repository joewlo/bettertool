import { z } from "zod";

export const HttpMethod = {
  Get: "GET",
  Post: "POST",
  Put: "PUT",
  Patch: "PATCH",
  Delete: "DELETE",
  Head: "HEAD",
  Options: "OPTIONS",
} as const;
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

export const bodyTypeSchema = z.enum(["none", "json", "text", "form", "graphql"]);
export type BodyType = z.infer<typeof bodyTypeSchema>;

export const restQuerySchema = z.object({
  type: z.literal("rest"),
  method: z.enum([
    HttpMethod.Get,
    HttpMethod.Post,
    HttpMethod.Put,
    HttpMethod.Patch,
    HttpMethod.Delete,
    HttpMethod.Head,
    HttpMethod.Options,
  ]),
  path: z.string().default(""),
  headers: z.record(z.string(), z.string()).default({}),
  params: z.record(z.string(), z.string()).default({}),
  bodyType: bodyTypeSchema.default("none"),
  body: z.string().default(""),
});
export type RestQuery = z.infer<typeof restQuerySchema>;

export const graphqlQuerySchema = z.object({
  type: z.literal("graphql"),
  query: z.string().default(""),
  variables: z.string().default("{}"),
  headers: z.record(z.string(), z.string()).default({}),
});
export type GraphqlQuery = z.infer<typeof graphqlQuerySchema>;

export const postgresQuerySchema = z.object({
  type: z.literal("postgres"),
  sql: z.string().default(""),
  parameters: z.array(z.string()).default([]),
});
export type PostgresQuery = z.infer<typeof postgresQuerySchema>;

export const querySchema = z.discriminatedUnion("type", [
  restQuerySchema,
  graphqlQuerySchema,
  postgresQuerySchema,
]);
export type Query = z.infer<typeof querySchema>;

export const queryRuntimeSchema = z.object({
  id: z.string(),
  name: z.string(),
  resourceId: z.string().nullable(),
  config: querySchema,
  runOnLoad: z.boolean().default(false),
  transformJs: z.string().default(""),
  enabled: z.boolean().default(true),
});
export type QueryRuntime = z.infer<typeof queryRuntimeSchema>;

export const eventActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("runQuery"), queryId: z.string() }),
  z.object({ type: z.literal("setValue"), componentId: z.string(), property: z.string(), value: z.string() }),
  z.object({ type: z.literal("navigate"), pageId: z.string() }),
  z.object({ type: z.literal("openModal"), componentId: z.string() }),
  z.object({ type: z.literal("closeModal"), componentId: z.string() }),
  z.object({ type: z.literal("showAlert"), message: z.string(), variant: z.enum(["info", "success", "warning", "error"]).default("info") }),
]);
export type EventAction = z.infer<typeof eventActionSchema>;

export const eventSchema = z.object({
  type: z.string(),
  actions: z.array(eventActionSchema).default([]),
});
export type Event = z.infer<typeof eventSchema>;

export const componentNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    props: z.record(z.string(), z.unknown()).default({}),
    layout: z.object({
      width: z.enum(["auto", "grow", "full"]).default("grow"),
      align: z.enum(["stretch", "start", "center", "end"]).default("stretch"),
    }).default({ width: "grow", align: "stretch" }),
    events: z.array(eventSchema).default([]),
    children: z.array(z.lazy(() => componentNodeSchema)).default([]),
  }),
);
export type ComponentNode = {
  id: string;
  type: string;
  name: string;
  props: Record<string, unknown>;
  layout: { width: "auto" | "grow" | "full"; align: "stretch" | "start" | "center" | "end" };
  events: Event[];
  children: ComponentNode[];
};

export const pageSchema = z.object({
  id: z.string(),
  name: z.string(),
  queries: z.array(queryRuntimeSchema).default([]),
  components: z.array(componentNodeSchema).default([]),
});
export type Page = z.infer<typeof pageSchema>;

export const appDefinitionSchema = z.object({
  version: z.literal(1).default(1),
  pages: z.array(pageSchema).default([]),
});
export type AppDefinition = z.infer<typeof appDefinitionSchema>;
