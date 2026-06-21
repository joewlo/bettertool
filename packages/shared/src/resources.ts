import { z } from "zod";

export const ResourceType = {
  Rest: "rest",
  Graphql: "graphql",
  Postgres: "postgres",
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

const restAuthSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("none"),
  }),
  z.object({
    type: z.literal("bearer"),
    token: z.string(),
  }),
  z.object({
    type: z.literal("apikey"),
    headerName: z.string().default("X-API-Key"),
    keyValue: z.string(),
  }),
  z.object({
    type: z.literal("basic"),
    username: z.string(),
    password: z.string(),
  }),
]);

export const restResourceConfigSchema = z.object({
  baseUrl: z.string().url().or(z.literal("")),
  headers: z.record(z.string(), z.string()).default({}),
  auth: restAuthSchema.default({ type: "none" }),
});
export type RestResourceConfig = z.infer<typeof restResourceConfigSchema>;

export const graphqlResourceConfigSchema = z.object({
  baseUrl: z.string().url().or(z.literal("")),
  headers: z.record(z.string(), z.string()).default({}),
  auth: restAuthSchema.default({ type: "none" }),
});
export type GraphqlResourceConfig = z.infer<typeof graphqlResourceConfigSchema>;

export const postgresResourceConfigSchema = z.object({
  connectionString: z.string(),
  ssl: z.boolean().default(false),
});
export type PostgresResourceConfig = z.infer<typeof postgresResourceConfigSchema>;

export const resourceConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal(ResourceType.Rest), config: restResourceConfigSchema }),
  z.object({ type: z.literal(ResourceType.Graphql), config: graphqlResourceConfigSchema }),
  z.object({ type: z.literal(ResourceType.Postgres), config: postgresResourceConfigSchema }),
]);
export type ResourceConfig = z.infer<typeof resourceConfigSchema>;

export const resourceCreateSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum([ResourceType.Rest, ResourceType.Graphql, ResourceType.Postgres]),
  config: z.unknown(),
});
export type ResourceCreate = z.infer<typeof resourceCreateSchema>;

export const resourceUpdateSchema = resourceCreateSchema.partial();
export type ResourceUpdate = z.infer<typeof resourceUpdateSchema>;

export const resourceRowSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  type: z.enum([ResourceType.Rest, ResourceType.Graphql, ResourceType.Postgres]),
  config: z.unknown(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ResourceRow = z.infer<typeof resourceRowSchema>;
