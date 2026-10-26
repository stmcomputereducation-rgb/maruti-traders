import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Maruti Traders | Complete Business ERP & Khata Book",
  description: "Enterprise Resource Planning, Inventory, Multiple Godowns, GST Invoices, and Khata Book Management for Maruti Traders.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
