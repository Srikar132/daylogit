import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service · Helm",
  description:
    "Read the Terms of Service governing your use of Helm daily progress desk and MCP AI services.",
  openGraph: {
    title: "Terms of Service · Helm",
    description: "Terms of Service for Helm progress desk.",
  },
};

export default function TermsPage() {
  return (
    <LegalLayout
      activeTab="terms"
      title="Terms of Service"
      subtitle="Please review the rules and conditions that govern your access to and use of Helm."
      lastUpdated="August 16, 2026"
    >
      <div className="space-y-10 text-sm leading-relaxed">
        {/* Section 1 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b6ef3]/20 text-[#8ab4f8] text-xs font-bold">
              1
            </span>
            Acceptance of Terms
          </h2>
          <p className="text-muted-foreground mb-3">
            By registering for, accessing, or using Helm (&quot;the Service&quot;), including any associated websites, API endpoints, or Model Context Protocol (MCP) servers provided by Helm, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
          <p className="text-muted-foreground">
            If you are entering into these Terms on behalf of a company, organization, or other legal entity, you represent and warrant that you have the authority to bind such entity to these Terms.
          </p>
        </section>

        {/* Section 2 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b6ef3]/20 text-[#8ab4f8] text-xs font-bold">
              2
            </span>
            Description of Service & MCP Integrations
          </h2>
          <p className="text-muted-foreground mb-3">
            Helm is a daily progress desk and workspace management platform designed for individuals and teams. The platform provides tools for logging daily tasks, tracking projects, collaborating within workspaces, and connecting external AI agents via the Model Context Protocol (MCP).
          </p>
          <p className="text-muted-foreground">
            When using MCP integrations, you retain full ownership and control over the AI tools and local prompts connected to your workspace. Helm acts solely as the interface and protocol conduit for authorized interactions.
          </p>
        </section>

        {/* Section 3 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b6ef3]/20 text-[#8ab4f8] text-xs font-bold">
              3
            </span>
            Account Registration & Security
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>
              <strong className="text-white">Account Accuracy:</strong> You agree to provide accurate, current, and complete information during registration and keep your account details updated.
            </li>
            <li>
              <strong className="text-white">Credential Safeguarding:</strong> You are responsible for maintaining the confidentiality of your account credentials, API keys, and session tokens.
            </li>
            <li>
              <strong className="text-white">Workspace Permissions:</strong> Workspace owners and administrators are responsible for managing member access levels and invitations within their workspace.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b6ef3]/20 text-[#8ab4f8] text-xs font-bold">
              4
            </span>
            Acceptable Use Policy
          </h2>
          <p className="text-muted-foreground mb-3">
            You agree not to use the Service to:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Violate any applicable local, state, national, or international laws or regulations.</li>
            <li>Attempt to probe, scan, or breach the security or authentication measures of any Helm system or network.</li>
            <li>Upload malicious code, viruses, or harmful payloads through logs, documents, or MCP endpoints.</li>
            <li>Interfere with or disrupt the performance of the Service for other users or workspaces.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b6ef3]/20 text-[#8ab4f8] text-xs font-bold">
              5
            </span>
            Intellectual Property & Data Rights
          </h2>
          <p className="text-muted-foreground mb-3">
            <strong className="text-white">Your Data:</strong> You retain all ownership rights in and to the content, logs, entries, notes, and media uploaded to or created within your Helm workspaces (&quot;Customer Content&quot;).
          </p>
          <p className="text-muted-foreground">
            <strong className="text-white">Helm Property:</strong> Helm retains all rights, title, and interest in and to the Helm platform, brand, logos, user interface designs, code, and trade secrets.
          </p>
        </section>

        {/* Section 6 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b6ef3]/20 text-[#8ab4f8] text-xs font-bold">
              6
            </span>
            Limitation of Liability
          </h2>
          <p className="text-muted-foreground">
            To the maximum extent permitted by law, Helm and its suppliers or licensors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your access to or inability to access the Service.
          </p>
        </section>

        {/* Section 7 */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b6ef3]/20 text-[#8ab4f8] text-xs font-bold">
              7
            </span>
            Changes & Contact Information
          </h2>
          <p className="text-muted-foreground mb-3">
            We reserve the right to modify these Terms at any time. Notice of material changes will be provided by updating the date at the top of this document or via notification within the application.
          </p>
          <p className="text-muted-foreground">
            For any questions regarding these Terms of Service, please contact our legal team at <span className="text-[#8ab4f8] underline">legal@helm.dev</span>.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
