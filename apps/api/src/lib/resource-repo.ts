import { and, eq } from "drizzle-orm";

import { getDb } from "@bettertool/db";
import { resources } from "@bettertool/db";
import {
  resourceConfigSchema,
  type ResourceCreate,
  type ResourceType,
  type ResourceUpdate,
} from "@bettertool/shared";

import { decryptJson, encryptJson, isEncryptedPayload } from "./crypto.js";

export type ResourceRow = {
  id: string;
  workspaceId: string;
  name: string;
  type: ResourceType;
  config: unknown;
  createdAt: string;
  updatedAt: string;
};

function rowToResourceRow(row: typeof resources.$inferSelect): ResourceRow {
  const config = isEncryptedPayload(row.config)
    ? decryptJson<unknown>(row.config)
    : row.config;
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    type: row.type,
    config,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validateConfig(type: ResourceType, config: unknown): unknown {
  const parsed = resourceConfigSchema.safeParse({ type, config });
  if (!parsed.success) {
    throw new Error(`invalid config: ${parsed.error.issues.map((i) => i.message).join(", ")}`);
  }
  return parsed.data.config;
}

export async function listResources(workspaceId: string): Promise<ResourceRow[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(resources)
    .where(eq(resources.workspaceId, workspaceId))
    .orderBy(resources.updatedAt);
  return rows.map(rowToResourceRow);
}

export async function getResource(workspaceId: string, id: string): Promise<ResourceRow> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, id), eq(resources.workspaceId, workspaceId)));
  if (!row) throw new Error("not found");
  return rowToResourceRow(row);
}

export async function createResource(
  workspaceId: string,
  input: ResourceCreate,
): Promise<ResourceRow> {
  const validatedConfig = validateConfig(input.type, input.config);
  const db = getDb();
  const [row] = await db
    .insert(resources)
    .values({
      workspaceId,
      name: input.name,
      type: input.type,
      config: encryptJson(validatedConfig),
    })
    .returning();
  if (!row) throw new Error("failed to create resource");
  return rowToResourceRow(row);
}

export async function updateResource(
  workspaceId: string,
  id: string,
  input: ResourceUpdate,
): Promise<ResourceRow> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(resources)
      .where(and(eq(resources.id, id), eq(resources.workspaceId, workspaceId)));
    if (!existing) throw new Error("not found");

    const updates: Partial<typeof resources.$inferInsert> = { updatedAt: new Date() };
    if (input.name !== undefined) updates.name = input.name;

    const newType: ResourceType = input.type ?? existing.type;
    if (input.type !== undefined) updates.type = input.type;

    if (input.config !== undefined) {
      const validatedConfig = validateConfig(newType, input.config);
      updates.config = encryptJson(validatedConfig);
    }

    const [updated] = await tx
      .update(resources)
      .set(updates)
      .where(and(eq(resources.id, id), eq(resources.workspaceId, workspaceId)))
      .returning();
    if (!updated) throw new Error("not found");
    return rowToResourceRow(updated);
  });
}

export async function deleteResource(workspaceId: string, id: string): Promise<void> {
  const db = getDb();
  const result = await db
    .delete(resources)
    .where(and(eq(resources.id, id), eq(resources.workspaceId, workspaceId)))
    .returning({ id: resources.id });
  if (result.length === 0) throw new Error("not found");
}
