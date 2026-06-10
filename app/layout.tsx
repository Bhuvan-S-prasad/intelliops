import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IntelliOps — Operational Intelligence, Organised",
  description:
    "AI-native operational intelligence platform. Upload documents, ask questions, and get answers with full source traceability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark antialiased`}>
      <body className="min-h-screen bg-background text-foreground">
        <ClerkProvider appearance={{ baseTheme: dark }}>
          <TooltipProvider delay={300}>
            {children}
          </TooltipProvider>
          <Toaster richColors position="bottom-right" />
        </ClerkProvider>
      </body>
    </html>
  );
}
