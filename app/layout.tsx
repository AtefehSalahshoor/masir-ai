import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  metadataBase: new URL("https://masir-ai.vercel.app/"),
  title: "Masir AI",
  description:
    "In Masir, you simply tell the AI what you want to achieve. It checks if your goal is realistic, breaks it into achievable daily steps, and sends gentle reminders. Instead of overwhelming users, Masir organizes their progress and keeps them consistent. A University project by Atefeh Salahshoor Goolan at Media University of Berlin.",
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

const THEME_COLOR = "hsl(24 95% 53%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', '${THEME_COLOR}');
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${geist.variable} ${geistMono.variable}`} lang="en">
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <Toaster position="top-center" />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
