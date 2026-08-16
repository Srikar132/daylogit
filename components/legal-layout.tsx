import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Shield, FileText, ExternalLink } from "lucide-react";

interface LegalLayoutProps {
  children: React.ReactNode;
  activeTab: "terms" | "policies";
  title: string;
  subtitle: string;
  lastUpdated: string;
}

export function LegalLayout({
  children,
  activeTab,
  title,
  subtitle,
  lastUpdated,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#e8eaed] flex flex-col font-sans selection:bg-[#1b6ef3]/30 selection:text-white">
      {/* Dynamic Ambient Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-radial from-[#1b6ef3]/15 via-[#8ab4f8]/5 to-transparent blur-[120px] rounded-full" />
      </div>

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0b0c0e]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-white/5 p-1 border border-white/10 group-hover:border-white/20 transition-all duration-300 shadow-md">
                <Image
                  src="/logo.png"
                  alt="Helm Logo"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain transition-transform group-hover:scale-105"
                  priority
                />
              </div>
              <span className="font-semibold text-lg tracking-tight text-white group-hover:text-white/90">
                Helm
              </span>
            </Link>

            <span className="text-white/20 text-sm font-light">/</span>

            <span className="text-sm font-medium text-muted-foreground">Legal & Compliance</span>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
              <Link
                href="/terms"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "terms"
                    ? "bg-[#1b6ef3] text-white shadow-sm"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Terms of Service
              </Link>
              <Link
                href="/policies"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "policies"
                    ? "bg-[#1b6ef3] text-white shadow-sm"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Privacy & Policies
              </Link>
            </nav>

            <Link
              href="/workspaces"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl border border-white/10 transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Desk
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Banner Section */}
        <div className="mb-10 text-center sm:text-left border-b border-white/[0.08] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-[#8ab4f8] mb-4">
            {activeTab === "terms" ? <FileText className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
            Official Documentation
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            {title}
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            {subtitle}
          </p>
          <div className="mt-4 text-xs text-white/40">
            Last Updated: <time dateTime={lastUpdated}>{lastUpdated}</time>
          </div>
        </div>

        {/* Legal Body Content */}
        <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-muted-foreground prose-strong:text-white prose-li:text-muted-foreground">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#08090a] py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Helm Logo"
              width={20}
              height={20}
              className="h-5 w-5 object-contain"
            />
            <span className="text-xs text-muted-foreground font-medium">
              &copy; {new Date().getFullYear()} Helm. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/policies" className="hover:text-white transition-colors">
              Privacy & Policies
            </Link>
            <Link href="/workspaces" className="hover:text-white transition-colors flex items-center gap-1">
              Workspaces <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
