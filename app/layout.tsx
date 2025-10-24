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
      <head>
        <script
          src="https://accounts.google.com/gsi/client"
          async
          defer
        />
        <script
          src="https://apis.google.com/js/api.js"
          async
          defer
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

