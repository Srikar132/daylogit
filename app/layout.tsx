import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
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
    default: "Helm — Daily progress desk",
    template: "%s · Helm",
  },
  description:
    "Your daily progress desk, for individuals and teams — controlled by you and your AI over MCP.",
  keywords: [
    "worklog",
    "daily log",
    "productivity",
    "team workspace",
    "MCP",
    "AI agent",
    "standup",
  ],
  authors: [{ name: "Helm" }],
  creator: "Helm",
  robots: {
    index: false, // self-hosted, keep private
    follow: false,
  },
  openGraph: {
    type: "website",
    title: "Helm — Daily progress desk",
    description: "Your daily progress desk, for individuals and teams — controlled by you and your AI over MCP.",
    siteName: "Helm",
  },
  twitter: {
    card: "summary",
    title: "Helm — Daily progress desk",
    description: "Your daily progress desk, controlled by you and your AI.",
  },
};

/* ── Viewport / Theme color ───────────────────────────────── */
export const viewport: Viewport = {
  themeColor: "#141414",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Pinch/double-tap are handed fully to the canvas's own zoom (xyflow) and
  // the widget interaction states — same call Figma/Miro/tldraw make on
  // mobile, otherwise the browser's own zoom fights the canvas's.
  maximumScale: 1,
  userScalable: false,
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
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
