import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Examina - Secure Examination Management System",
  description: "Create, conduct, monitor and evaluate online examinations with integrity and fairness.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-white text-gray-900`}>
        <ToastProvider>
          <Suspense fallback={<div className="p-8">Loading...</div>}>
            {children}
          </Suspense>
        </ToastProvider>
      </body>
    </html>
  );
}
