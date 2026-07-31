import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Syne } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProgressProvider } from "@/context/ProgressContext";
import { cn } from "@/lib/utils";
import "./globals.css";

// Manrope: rounded humanist with open counters — friendlier than a neutral
// grotesque without going soft at the 13px the table runs at.
const fontUi = Manrope({ subsets: ["latin"], variable: "--font-ui" });
// Syne: wide, slightly strange display forms. Carries the headlines alone.
const fontDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});
const fontData = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-data",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Grindtrack — Company Interview Tracker",
  description: "Personal LeetCode company-wise interview question tracker.",
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
