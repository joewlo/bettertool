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

export type RevisionRow = {
  id: string;
  appId: string;
  createdAt: string;
  createdById: string | null;
};

export type RevisionDetail = {
  id: string;
  appId: string;
  definition: unknown;
  createdAt: string;
};

export function useAppRevisions(appId: string | undefined) {
  return useQuery({
    queryKey: ["app", appId, "revisions"],
    queryFn: () => api.get<RevisionRow[]>(`/api/apps/${appId}/revisions`),
    enabled: !!appId,
  });
}

export function useRevision(appId: string | undefined, revisionId: string | undefined) {
  return useQuery({
    queryKey: ["app", appId, "revision", revisionId],
    queryFn: () =>
      api.get<RevisionDetail>(`/api/apps/${appId}/revisions/${revisionId}`),
    enabled: !!revisionId,
  });
}

export type GraphqlSchema = {
  queryType: { name: string } | null;
  mutationType: { name: string } | null;
  subscriptionType: { name: string } | null;
  types: GraphqlType[];
  directives?: unknown[];
};

export type GraphqlType = {
  kind:
    | "OBJECT"
    | "INTERFACE"
    | "UNION"
    | "ENUM"
    | "INPUT_OBJECT"
    | "SCALAR"
    | "LIST"
    | "NON_NULL";
  name: string | null;
  description?: string | null;
  fields?: GraphqlField[] | null;
  inputFields?: (GraphqlField & { defaultValue?: string | null })[] | null;
  enumValues?: { name: string; description?: string | null }[] | null;
  interfaces?: GraphqlType[] | null;
  ofType?: GraphqlType | null;
};

export type GraphqlField = {
  name: string;
  description?: string | null;
  type: GraphqlTypeRef;
  args: (GraphqlField & { defaultValue?: string | null })[];
};

export type GraphqlTypeRef = {
  kind:
    | "LIST"
    | "NON_NULL"
    | "OBJECT"
    | "SCALAR"
    | "ENUM"
    | "INTERFACE"
    | "UNION"
    | "INPUT_OBJECT";
  name: string | null;
  ofType?: GraphqlTypeRef | null;
};

export function useIntrospectGraphql() {
  return useMutation({
    mutationFn: ({ resourceId }: { resourceId: string }) =>
      api.post<RestResponse>(`/api/proxy/graphql/${resourceId}/introspect`, {}),
  });
}

export function extractSchema(responseData: unknown): GraphqlSchema | null {
  if (!responseData || typeof responseData !== "object" || Array.isArray(responseData)) {
    return null;
  }
  const outer = responseData as Record<string, unknown>;
  const data = outer.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const schema = (data as Record<string, unknown>).__schema;
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return null;
  }
  return schema as GraphqlSchema;
}
