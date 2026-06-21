import { relations } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const resourceTypeEnum = pgEnum("resource_type", ["rest", "graphql", "postgres"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: varchar("external_id", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 320 }).notNull(),
    username: varchar("username", { length: 120 }).notNull(),
    groups: text("groups").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_external_id_idx").on(t.externalId), index("users_email_idx").on(t.email)],
);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  groupKey: varchar("group_key", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apps = pgTable(
  "apps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description").default(""),
    definition: jsonb("definition").notNull().default({ version: 1, pages: [] }),
    publishedDefinition: jsonb("published_definition"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("apps_workspace_idx").on(t.workspaceId)],
);

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    type: resourceTypeEnum("type").notNull(),
    config: jsonb("config").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("resources_workspace_idx").on(t.workspaceId)],
);

export const appRevisions = pgTable(
  "app_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    definition: jsonb("definition").notNull(),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("app_revisions_app_idx").on(t.appId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaces),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerUserId], references: [users.id] }),
  apps: many(apps),
  resources: many(resources),
}));

export const appsRelations = relations(apps, ({ many, one }) => ({
  workspace: one(workspaces, { fields: [apps.workspaceId], references: [workspaces.id] }),
  revisions: many(appRevisions),
  createdBy: one(users, { fields: [apps.createdById], references: [users.id] }),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  workspace: one(workspaces, { fields: [resources.workspaceId], references: [workspaces.id] }),
}));

export const appRevisionsRelations = relations(appRevisions, ({ one }) => ({
  app: one(apps, { fields: [appRevisions.appId], references: [apps.id] }),
}));
