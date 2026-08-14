import { oAuthProtectedResourceMetadata } from "better-auth/plugins";
import { auth } from "@/lib/better-auth";

// Tells MCP clients which authorization server protects this resource
// (this app itself, per the MCP OAuth spec's resource-metadata step).
export const GET = oAuthProtectedResourceMetadata(auth);
