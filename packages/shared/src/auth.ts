export interface AuthUser {
  externalId: string;
  email: string;
  username: string;
  groups: string[];
  accessToken?: string;
  isAdmin: boolean;
}

export const ReservedModelKeys = {
  queries: "queries",
  components: "components",
  globals: "globals",
} as const;
