import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Sklepik - School Kiosk Management",
  description: "Management system for school kiosk and vending services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = function (...args) {
    // Check if this is the params warning we want to suppress
    if (args[0] && typeof args[0] === 'string' &&
        args[0].includes('A param property was accessed directly') &&
        args[0].includes('params is now a Promise')) {
      // Skip logging this specific error
      return;
    }

    // Otherwise, pass through to the original console.error
    return originalConsoleError.apply(console, args);
  };
}