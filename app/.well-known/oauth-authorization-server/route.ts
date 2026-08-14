import { oAuthDiscoveryMetadata } from "better-auth/plugins";
import { auth } from "@/lib/better-auth";

// Lets MCP clients (Claude Desktop/Code) auto-discover the OAuth
// authorize/token endpoints instead of needing them configured by hand.
export const GET = oAuthDiscoveryMetadata(auth);
