import { and, eq } from "drizzle-orm";

import { getDb } from "@bettertool/db";
import { appRevisions, apps } from "@bettertool/db";
import { appDefinitionSchema, type AppDefinition } from "@bettertool/shared";

export type AppRow = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  definition: unknown;
  publishedDefinition: unknown | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AppListRow = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_DEFINITION: AppDefinition = { version: 1, pages: [] };

function rowToAppRow(row: typeof apps.$inferSelect): AppRow {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    definition: row.definition,
    publishedDefinition: row.publishedDefinition,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listApps(workspaceId: string): Promise<AppListRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: apps.id,
      workspaceId: apps.workspaceId,
      name: apps.name,
      description: apps.description,
      createdAt: apps.createdAt,
      updatedAt: apps.updatedAt,
    })
    .from(apps)
    .where(eq(apps.workspaceId, workspaceId))
    .orderBy(apps.updatedAt);
  return rows;
}

export async function getApp(workspaceId: string, id: string): Promise<AppRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.workspaceId, workspaceId)));
  return row ? rowToAppRow(row) : null;
}

export async function createApp(
  workspaceId: string,
  userId: string,
  input: { name: string; description?: string },
): Promise<AppRow> {
  const db = getDb();
  const [row] = await db
    .insert(apps)
    .values({
      workspaceId,
      name: input.name,
      description: input.description ?? "",
      definition: DEFAULT_DEFINITION,
      createdById: userId,
    })
    .returning();
  if (!row) throw new Error("failed to create app");
  return rowToAppRow(row);
}

export async function updateApp(
  workspaceId: string,
  id: string,
  input: { name?: string; description?: string; definition?: unknown },
): Promise<AppRow> {
  const db = getDb();

  if (input.definition !== undefined) {
    const parsed = appDefinitionSchema.safeParse(input.definition);
    if (!parsed.success) {
      throw new Error(`invalid definition: ${parsed.error.message}`);
    }
  }

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(apps)
      .where(and(eq(apps.id, id), eq(apps.workspaceId, workspaceId)));
    if (!existing) throw new Error("not found");

    if (input.definition !== undefined) {
      await tx.insert(appRevisions).values({
        appId: existing.id,
        definition: existing.definition,
        createdById: existing.createdById,
      });
    }

    const updates: Partial<typeof apps.$inferInsert> = { updatedAt: new Date() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.definition !== undefined) updates.definition = input.definition;

    const [updated] = await tx
      .update(apps)
      .set(updates)
      .where(and(eq(apps.id, id), eq(apps.workspaceId, workspaceId)))
      .returning();
    if (!updated) throw new Error("not found");
    return rowToAppRow(updated);
  });
}

export async function deleteApp(workspaceId: string, id: string): Promise<void> {
  const db = getDb();
  const result = await db
    .delete(apps)
    .where(and(eq(apps.id, id), eq(apps.workspaceId, workspaceId)))
    .returning({ id: apps.id });
  if (result.length === 0) throw new Error("not found");
}
