import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PTO Tracker",
  description: "PTO accrual tracking, requests and approvals for the PH team",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
