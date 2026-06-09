import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = {
  title: "Schbang Pulse",
  description: "Internal website & API monitoring platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-fg antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
