import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* ── Metadata ─────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: {
    default: "DayLogIt — Worklog",
    template: "%s · DayLogIt",
  },
  description:
    "Self-hosted daily worklog. Track what you build, analyze, debug and design — across all your projects, every day.",
  keywords: [
    "worklog",
    "daily log",
    "productivity",
    "developer log",
    "time tracking",
    "project tracker",
  ],
  authors: [{ name: "DayLogIt" }],
  creator: "DayLogIt",
  robots: {
    index: false, // self-hosted, keep private
    follow: false,
  },
  openGraph: {
    type: "website",
    title: "DayLogIt — Worklog",
    description:
      "Self-hosted daily worklog. Track what you build, analyze, debug and design — across all your projects.",
    siteName: "DayLogIt",
  },
  twitter: {
    card: "summary",
    title: "DayLogIt — Worklog",
    description: "Self-hosted daily worklog across all your projects.",
  },
};

/* ── Viewport / Theme color ───────────────────────────────── */
export const viewport: Viewport = {
  themeColor: "#141414",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/* ── Root Layout ──────────────────────────────────────────── */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
