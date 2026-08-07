import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "W Smithers and Sons — Job Management",
  description: "Internal job management platform for W Smithers and Sons.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
