import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthDebug } from "@/components/debug/AuthDebug";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClientHandle - Follow-ups & invoices, the premium way",
  description: "AI-powered freelancer tool for managing client relationships, follow-ups, and invoices with elegant, premium-inspired design.",
  keywords: ["freelancer", "invoicing", "client management", "AI", "follow-ups"],
  authors: [{ name: "ClientHandle" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "ClientHandle - Follow-ups & invoices, the premium way",
    description: "AI-powered freelancer tool with premium-inspired design",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} h-full antialiased`}>
        <AuthProvider>
          {children}
          <AuthDebug />
        </AuthProvider>
      </body>
    </html>
  );
}
