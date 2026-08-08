import type { Metadata, Viewport } from "next";
// Self-hosted variable fonts (shipped as woff2 inside the npm packages) rather
// than next/font/google — no build-time fetch to fonts.googleapis.com, so the
// build works on any network and there's no third-party request at runtime.
import "@fontsource-variable/inter";
import "@fontsource-variable/outfit";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "W Smithers and Sons",
    template: "%s · W Smithers and Sons",
  },
  description: "Job management platform for W Smithers and Sons — builders since 1955.",
  icons: { icon: "/mark.png", apple: "/mark.png" },
};

export const viewport: Viewport = {
  themeColor: "#c63e29",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-ink-50 text-ink-900">{children}</body>
    </html>
  );
}
