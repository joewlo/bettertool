import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GraphqlQuery, PostgresQuery, RestQuery } from "@bettertool/shared";

import { api } from "@/lib/api";

export type AppRow = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  definition?: unknown;
  publishedDefinition?: unknown | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

type MeResponse = {
  user: unknown;
  userId: string;
  workspaceId: string;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/api/me"),
  });
}

export function useApps() {
  return useQuery({
    queryKey: ["apps"],
    queryFn: () => api.get<AppRow[]>("/api/apps"),
  });
}

export function useApp(id: string | undefined) {
  return useQuery({
    queryKey: ["app", id],
    queryFn: () => api.get<AppRow>(`/api/apps/${id}`),
    enabled: !!id,
  });
}

type CreateAppBody = { name: string; description?: string };

export function useCreateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAppBody) => api.post<AppRow>("/api/apps", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["apps"] });
    },
  });
}

type UpdateAppBody = { name?: string; description?: string; definition?: unknown };

export function useUpdateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateAppBody & { id: string }) =>
      api.put<AppRow>(`/api/apps/${id}`, body),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["apps"] });
      void qc.invalidateQueries({ queryKey: ["app", variables.id] });
    },
  });
}

export function useDeleteApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/apps/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["apps"] });
    },
  });
}

export type ResourceRow = {
  id: string;
  workspaceId: string;
  name: string;
  type: "rest" | "graphql" | "postgres";
  config: unknown;
  createdAt: string;
  updatedAt: string;
};

export type RestResponse = {
  status: number;
  headers: Record<string, string>;
  data: unknown;
  durationMs: number;
  truncated?: boolean;
};

export function useResources() {
  return useQuery({
    queryKey: ["resources"],
    queryFn: () => api.get<ResourceRow[]>("/api/resources"),
  });
}

export function useResource(id: string | undefined) {
  return useQuery({
    queryKey: ["resource", id],
    queryFn: () => api.get<ResourceRow>(`/api/resources/${id}`),
    enabled: !!id,
  });
}

type CreateResourceBody = {
  name: string;
  type: "rest" | "graphql" | "postgres";
  config: unknown;
};

export function useCreateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateResourceBody) => api.post<ResourceRow>("/api/resources", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["resources"] });
    },
  });
}

type UpdateResourceBody = {
  name?: string;
  type?: "rest" | "graphql" | "postgres";
  config?: unknown;
};

export function useUpdateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateResourceBody & { id: string }) =>
      api.put<ResourceRow>(`/api/resources/${id}`, body),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["resources"] });
      void qc.invalidateQueries({ queryKey: ["resource", variables.id] });
    },
  });
}

export function useDeleteResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/resources/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["resources"] });
    },
  });
}

export function useRunRestQuery() {
  return useMutation({
    mutationFn: ({ resourceId, query }: { resourceId: string; query: RestQuery }) =>
      api.post<RestResponse>(`/api/proxy/http/${resourceId}`, query),
  });
}

export function useRunGraphqlQuery() {
  return useMutation({
    mutationFn: ({ resourceId, query }: { resourceId: string; query: GraphqlQuery }) =>
      api.post<RestResponse>(`/api/proxy/graphql/${resourceId}`, query),
  });
}

export type PgResponse = {
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
  command: string;
};

export function useRunPostgresQuery() {
  return useMutation({
    mutationFn: ({ resourceId, query }: { resourceId: string; query: PostgresQuery }) =>
      api.post<PgResponse>(`/api/proxy/postgres/${resourceId}`, query),
  });
}
