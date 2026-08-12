import { requireViewerContext } from "@/lib/workspace";
import { listApiKeys } from "@/lib/api-keys";
import { ApiKeyManager } from "@/components/settings/api-key-manager";

export default async function ApiKeysSettingsPage() {
  const viewer = await requireViewerContext();
  const keys = await listApiKeys(viewer.userId, viewer.organizationId);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-lg font-semibold text-foreground">API keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use a key to connect Helm to Claude Code, Claude Desktop, or any MCP client. Each key
          acts as you, scoped to this workspace.
        </p>
      </div>
      <ApiKeyManager initialKeys={keys} />
    </main>
  );
}
