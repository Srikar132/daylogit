import { listMyConnectionsAction } from "@/lib/actions/connections";
import { ConnectionsManager } from "@/components/settings/connections-manager";

export default async function ConnectionsSettingsPage() {
  const { connections } = await listMyConnectionsAction();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Connections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Apps you&apos;ve connected via OAuth — Claude Desktop, Claude Code, or any other MCP client. Connecting
          happens from the client itself (point it at this server); disconnect an app here to revoke its access.
        </p>
      </div>
      <ConnectionsManager initialConnections={connections} />
    </main>
  );
}
