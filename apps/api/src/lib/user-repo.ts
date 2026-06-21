import { and, eq } from "drizzle-orm";

import { getDb } from "@bettertool/db";
import { users, workspaces } from "@bettertool/db";
import type { AuthUser } from "@bettertool/shared";

export async function upsertUser(user: AuthUser): Promise<{ userId: string; workspaceId: string }> {
  const db = getDb();
  const [row] = await db
    .insert(users)
    .values({
      externalId: user.externalId,
      email: user.email,
      username: user.username,
      groups: user.groups,
    })
    .onConflictDoUpdate({
      target: users.externalId,
      set: {
        email: user.email,
        username: user.username,
        groups: user.groups,
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id });

  if (!row) throw new Error("failed to upsert user");
  const userId = row.id;

  const [existing] = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.ownerUserId, userId), eq(workspaces.groupKey, "personal")));

  if (existing) {
    return { userId, workspaceId: existing.id };
  }

  const [ws] = await db
    .insert(workspaces)
    .values({ name: `${user.username}'s workspace`, ownerUserId: userId, groupKey: "personal" })
    .returning({ id: workspaces.id });

  if (!ws) throw new Error("failed to create workspace");
  return { userId, workspaceId: ws.id };
}
