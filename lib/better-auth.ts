import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as authSchema from "@/lib/auth-schema";

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
    }),
    // Must be last — lets server actions calling auth.api.* set cookies directly.
    nextCookies(),
  ],
});
