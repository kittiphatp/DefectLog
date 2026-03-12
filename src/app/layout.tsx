import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Defect Log",
  description: "Defect tracking and management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
