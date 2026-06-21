import { useEffect, useState } from "react";

import type {
  GraphqlResourceConfig,
  PostgresResourceConfig,
  RestResourceConfig,
} from "@bettertool/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { KeyValueEditor } from "@/components/ui/key-value-editor";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import {
  useRunPostgresQuery,
  useRunRestQuery,
  useUpdateResource,
  type ResourceRow,
} from "@/lib/queries";

type RestAuth = RestResourceConfig["auth"];

interface ResourceEditorDialogProps {
  resource: ResourceRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AnyConfig = RestResourceConfig | GraphqlResourceConfig | PostgresResourceConfig;

function readConfig(resource: ResourceRow): AnyConfig {
  if (resource.type === "postgres") {
    return (resource.config as PostgresResourceConfig) ?? {
      connectionString: "",
      ssl: false,
    };
  }
  return (resource.config as RestResourceConfig) ?? {
    baseUrl: "",
    headers: {},
    auth: { type: "none" },
  };
}

function newAuth(type: RestAuth["type"]): RestAuth {
  switch (type) {
    case "none":
      return { type: "none" };
    case "bearer":
      return { type: "bearer", token: "" };
    case "apikey":
      return { type: "apikey", headerName: "X-API-Key", keyValue: "" };
    case "basic":
      return { type: "basic", username: "", password: "" };
  }
}

export function ResourceEditorDialog({
  resource,
  open,
  onOpenChange,
}: ResourceEditorDialogProps) {
  const updateResource = useUpdateResource();
  const runRestQuery = useRunRestQuery();
  const runPostgresQuery = useRunPostgresQuery();

  const [name, setName] = useState(resource.name);
  const [config, setConfig] = useState<AnyConfig>(readConfig(resource));
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: number; durationMs: number } | null>(
    null,
  );

  useEffect(() => {
    if (open) {
      setName(resource.name);
      setConfig(readConfig(resource));
      setTestResult(null);
    }
  }, [open, resource]);

  const isHttp = resource.type === "rest" || resource.type === "graphql";
  const httpConfig = config as RestResourceConfig;

  function patchHttp(patch: Partial<RestResourceConfig>) {
    setConfig((prev) => ({ ...(prev as RestResourceConfig), ...patch }));
  }

  function patchPg(patch: Partial<PostgresResourceConfig>) {
    setConfig((prev) => ({ ...(prev as PostgresResourceConfig), ...patch }));
  }

  async function handleSave() {
    try {
      await updateResource.mutateAsync({
        id: resource.id,
        name: name.trim() || resource.name,
        type: resource.type,
        config,
      });
      toast.success("Resource saved");
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to save resource", { description: (err as Error).message });
    }
  }

  async function handleTestHttp() {
    setTesting(true);
    setTestResult(null);
    try {
      await updateResource.mutateAsync({
        id: resource.id,
        name: name.trim() || resource.name,
        type: resource.type,
        config,
      });
      const res = await runRestQuery.mutateAsync({
        resourceId: resource.id,
        query: {
          type: "rest",
          method: "GET",
          path: "",
          headers: {},
          params: {},
          bodyType: "none",
          body: "",
        },
      });
      setTestResult({ status: res.status, durationMs: res.durationMs });
    } catch (err) {
      toast.error("Test failed", { description: (err as Error).message });
    } finally {
      setTesting(false);
    }
  }

  async function handleTestPg() {
    const cfg = config as PostgresResourceConfig;
    if (cfg.connectionString.trim().length === 0) {
      toast.error("Connection string is required");
      return;
    }
    if (!/^postgres(ql)?:\/\//.test(cfg.connectionString.trim())) {
      toast.error("Invalid connection string", {
        description: "Expected a string starting with postgres:// or postgresql://",
      });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      await updateResource.mutateAsync({
        id: resource.id,
        name: name.trim() || resource.name,
        type: resource.type,
        config,
      });
      const res = await runPostgresQuery.mutateAsync({
        resourceId: resource.id,
        query: { type: "postgres", sql: "SELECT 1 as test", parameters: [] },
      });
      setTestResult({ status: 200, durationMs: res.durationMs });
      toast.success("Connection succeeded");
    } catch (err) {
      setTestResult({ status: 502, durationMs: 0 });
      toast.error("Connection failed", { description: (err as Error).message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit resource</DialogTitle>
          <DialogDescription>
            Configure how bettertool connects to this resource.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resource-name">Name</Label>
            <Input
              id="resource-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Type:</span>
            <Badge variant="secondary" className="uppercase">
              {resource.type}
            </Badge>
          </div>

          <Separator />

          {isHttp ? (
            <HttpConfigEditor
              config={httpConfig}
              onPatch={patchHttp}
              onTest={handleTestHttp}
              testing={testing}
              testResult={testResult}
            />
          ) : (
            <PostgresConfigEditor
              config={config as PostgresResourceConfig}
              onPatch={patchPg}
              onTest={handleTestPg}
              testing={testing}
              testResult={testResult}
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={updateResource.isPending}>
            {updateResource.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface HttpConfigEditorProps {
  config: RestResourceConfig;
  onPatch: (patch: Partial<RestResourceConfig>) => void;
  onTest: () => void;
  testing: boolean;
  testResult: { status: number; durationMs: number } | null;
}

function HttpConfigEditor({
  config,
  onPatch,
  onTest,
  testing,
  testResult,
}: HttpConfigEditorProps) {
  const auth = config.auth;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="base-url">Base URL</Label>
        <Input
          id="base-url"
          value={config.baseUrl}
          onChange={(e) => onPatch({ baseUrl: e.target.value })}
          placeholder="https://api.example.com"
        />
      </div>

      <div className="space-y-2">
        <Label>Authentication</Label>
        <Select
          value={auth.type}
          onValueChange={(v) => onPatch({ auth: newAuth(v as RestAuth["type"]) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="bearer">Bearer token</SelectItem>
            <SelectItem value="apikey">API key</SelectItem>
            <SelectItem value="basic">Basic auth</SelectItem>
          </SelectContent>
        </Select>

        {auth.type === "bearer" && (
          <Input
            value={auth.token}
            onChange={(e) => onPatch({ auth: { type: "bearer", token: e.target.value } })}
            placeholder="Token"
            type="password"
          />
        )}
        {auth.type === "apikey" && (
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={auth.headerName}
              onChange={(e) =>
                onPatch({ auth: { type: "apikey", headerName: e.target.value, keyValue: auth.keyValue } })
              }
              placeholder="Header name (e.g. X-API-Key)"
            />
            <Input
              value={auth.keyValue}
              onChange={(e) =>
                onPatch({ auth: { type: "apikey", headerName: auth.headerName, keyValue: e.target.value } })
              }
              placeholder="Key value"
              type="password"
            />
          </div>
        )}
        {auth.type === "basic" && (
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={auth.username}
              onChange={(e) =>
                onPatch({ auth: { type: "basic", username: e.target.value, password: auth.password } })
              }
              placeholder="Username"
            />
            <Input
              value={auth.password}
              onChange={(e) =>
                onPatch({ auth: { type: "basic", username: auth.username, password: e.target.value } })
              }
              placeholder="Password"
              type="password"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Headers</Label>
        <KeyValueEditor
          value={config.headers}
          onChange={(headers) => onPatch({ headers })}
          keyPlaceholder="Header name"
          valuePlaceholder="Header value"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onTest} disabled={testing}>
          {testing ? "Testing..." : "Test connection"}
        </Button>
        {testResult && (
          <div className="flex items-center gap-2 text-sm">
            <span>Status:</span>
            <StatusBadge status={testResult.status} />
            {testResult.durationMs > 0 && (
              <span className="text-muted-foreground">{testResult.durationMs}ms</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface PostgresConfigEditorProps {
  config: PostgresResourceConfig;
  onPatch: (patch: Partial<PostgresResourceConfig>) => void;
  onTest: () => void;
  testing: boolean;
  testResult: { status: number; durationMs: number } | null;
}

function PostgresConfigEditor({
  config,
  onPatch,
  onTest,
  testing,
  testResult,
}: PostgresConfigEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pg-conn">Connection string</Label>
        <Input
          id="pg-conn"
          value={config.connectionString}
          onChange={(e) => onPatch({ connectionString: e.target.value })}
          placeholder="postgresql://user:pass@host:5432/db"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.ssl}
          onChange={(e) => onPatch({ ssl: e.target.checked })}
          className="h-4 w-4 rounded border-input"
        />
        Require SSL
      </label>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onTest} disabled={testing}>
          {testing ? "Testing..." : "Test connection"}
        </Button>
        {testResult && (
          <div className="flex items-center gap-2 text-sm">
            <span>Status:</span>
            <StatusBadge status={testResult.status} />
            {testResult.durationMs > 0 && (
              <span className="text-muted-foreground">{testResult.durationMs}ms</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: number }) {
  const variant =
    status >= 200 && status < 300
      ? "success"
      : status >= 300 && status < 400
        ? "warning"
        : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}
