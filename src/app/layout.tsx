import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProgressProvider } from "@/context/ProgressContext";
import { cn } from "@/lib/utils";
import "./globals.css";

// Inter for everything, headings included. It is the default of the modern web
// for a reason: nobody has to think about it.
const fontUi = Inter({ subsets: ["latin"], variable: "--font-ui" });
const fontDisplay = Inter({ subsets: ["latin"], variable: "--font-display" });
// Monospace is kept for figures only, so counts and percentages stay aligned.
const fontData = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-data",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Grindtrack — Company Interview Tracker",
  description: "Personal LeetCode company-wise interview question tracker.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale/userScalable cap — pinch-zoom stays available.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1113" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(fontUi.variable, fontDisplay.variable, fontData.variable)}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        {/* Dark is the design, not a preference — the light theme is kept as a
            desaturated fallback for anyone who forces it. */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            <ProgressProvider>
              <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
              <Toaster />
            </ProgressProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
