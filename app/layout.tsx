import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HRMS - Human Resource Management System",
  description: "Modern and elegant HR management solution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

