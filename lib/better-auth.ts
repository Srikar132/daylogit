import { after } from "next/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { mcp, organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as authSchema from "@/lib/auth-schema";
import { sendEmail } from "@/lib/email";
import { buildInvitationEmail } from "@/lib/emails/invitation";

type SocialProviderConfig = {
  clientId: string;
  clientSecret: string;
  prompt?: "select_account" | "consent" | "login" | "none" | "select_account consent";
};

const socialProviders: Record<string, SocialProviderConfig> = {};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // Lets the account picker show even with only one active Google session.
    prompt: "select_account",
  };
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
    // neon-http has no multi-statement transaction support
    transaction: false,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders,
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      // Called by better-auth right after the invitation row is written, and
      // awaited by createInvitation — so sending inline makes the person
      // clicking "Invite" wait on the mail server (measured ~20s against Gmail
      // SMTP). `after()` runs it once the response is already on its way,
      // which also means a mail outage can't fail an otherwise-valid
      // invitation: the row exists, and the members list offers the same link
      // via "Copy link". Failures are logged, never surfaced as invite errors.
      sendInvitationEmail: async ({ id, email, role, organization: org, inviter }) => {
        const { subject, html, text } = buildInvitationEmail({
          workspaceName: org.name,
          inviterLabel: inviter.user.name || inviter.user.email,
          role,
          invitationId: id,
        });
        const deliver = () =>
          sendEmail({ to: email, subject, html, text }).catch((err) => {
            console.error("Failed to send invitation email:", err);
          });
        try {
          after(deliver);
        } catch {
          // after() needs a request context — outside one (a script, a test),
          // fall back to awaiting so the mail still goes out.
          await deliver();
        }
      },
    }),
    // OAuth 2.0 authorization server for MCP clients (Claude Desktop/Code) —
    // replaces the old manual-API-key "paste a token" connect flow with a
    // real "click Connect, approve in the browser" one. Org-scoping for
    // step 1 is resolved live per-request (lib/mcp-auth.ts) rather than
    // baked into the token — see the OAuth connect flow plan for why.
    mcp({ loginPage: "/sign-in" }),
    // Must be last — lets server actions calling auth.api.* set cookies directly.
    nextCookies(),
  ],
});
