import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Privacy & Security Policies · Helm",
  description:
    "Learn how Helm protects your privacy, handles customer content, and secures workspace data.",
  openGraph: {
    title: "Privacy & Security Policies · Helm",
    description: "Privacy and security policies for Helm.",
  },
};

export default function PoliciesPage() {
  return (
    <LegalLayout
      activeTab="policies"
      title="Privacy & Security Policies"
      subtitle="Discover how we safeguard your data, enforce privacy-first controls, and handle information."
      lastUpdated="August 16, 2026"
    >
      <div className="space-y-10 text-sm leading-relaxed">
        {/* Section 1 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b6ef3]/20 text-[#8ab4f8] text-xs font-bold">
              1
            </span>
            Information Collection & Usage
          </h2>
          <p className="text-muted-foreground mb-3">
            At Helm, privacy is foundational. We collect only the information necessary to provide you with a reliable, secure daily progress desk:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>
              <strong className="text-white">Account Information:</strong> Your name, email address, profile picture, and authentication credentials provided via our authentication providers (e.g. OAuth).
            </li>
            <li>
              <strong className="text-white">Workspace Data:</strong> Task logs, work items, project categories, workspace metadata, and attachments created by you and your team members.
            </li>
            <li>
              <strong className="text-white">Technical Diagnostics:</strong> Anonymized error reports and operational performance metrics required to maintain system stability.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b6ef3]/20 text-[#8ab4f8] text-xs font-bold">
              2
            </span>
            MCP & AI Privacy Commitments
          </h2>
          <p className="text-muted-foreground mb-3">
            Helm integrates with Model Context Protocol (MCP) servers allowing local or custom AI assistants to interface with your workspace:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>
              <strong className="text-white">No Public AI Training:</strong> We do NOT sell, rent, or use your private workspace logs or customer content to train public AI models.
            </li>
            <li>
              <strong className="text-white">Scoped Access:</strong> MCP access tokens are encrypted and strictly isolated to the workspace scope defined by the workspace administrator.
            </li>
            <li>
              <strong className="text-white">Local-First Choice:</strong> Developers and teams can run self-hosted MCP agents, giving you complete physical control over AI data flows.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b6ef3]/20 text-[#8ab4f8] text-xs font-bold">
              3
            </span>
            Data Storage & Encryption
          </h2>
          <p className="text-muted-foreground mb-3">
            We employ modern security best practices to protect your data across all environments:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>
              <strong className="text-white">Encryption in Transit:</strong> All HTTP/WebSocket communication with Helm is encrypted using standard TLS 1.3 encryption.
            </li>
            <li>
              <strong className="text-white">Encryption at Rest:</strong> Database tables, storage buckets, and secrets are encrypted at rest using AES-256 standards.
            </li>
            <li>
              <strong className="text-white">Multi-Tenant Isolation:</strong> Workspace data is logically partitioned and protected by strict database access policies.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b6ef3]/20 text-[#8ab4f8] text-xs font-bold">
              4
            </span>
            Data Retention & Deletion
          </h2>
          <p className="text-muted-foreground mb-3">
            You maintain full control over your data retention lifecycle:
          </p>
          <p className="text-muted-foreground">
            When a workspace or user account is deleted, associated entries, project tags, and integration connections are permanently removed or anonymized from our primary databases within 30 days.
          </p>
        </section>

        {/* Section 5 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b6ef3]/20 text-[#8ab4f8] text-xs font-bold">
              5
            </span>
            Cookies & Local Storage
          </h2>
          <p className="text-muted-foreground">
            Helm uses essential session cookies and local storage items required for user authentication, security verification, and active workspace preferences. We do not place third-party advertising tracking cookies.
          </p>
        </section>

        {/* Section 6 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b6ef3]/20 text-[#8ab4f8] text-xs font-bold">
              6
            </span>
            Contact Privacy Officer
          </h2>
          <p className="text-muted-foreground mb-3">
            If you have questions, data subject requests, or privacy concerns, please contact our Data Protection Officer at:
          </p>
          <p className="text-[#8ab4f8] font-mono text-xs bg-white/5 p-3 rounded-xl border border-white/10 inline-block">
            privacy@helm.dev
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
