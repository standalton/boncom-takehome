/**
 * layout.tsx — root layout.
 *
 * What:        Sets up the Open Sans brand font, global styles, the toast
 *              host (Sonner), and the tooltip provider for the whole app.
 * Where used:  Wraps every route.
 * Notes:       Open Sans matches the Boncom brand. TooltipProvider must wrap
 *              the tree for HelpHint tooltips to work.
 */
import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "kwik-quote",
  description: "Quick, accurate client estimates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${openSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider delay={0} closeDelay={0}>{children}</TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
