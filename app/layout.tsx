import type { Metadata } from "next";
import { DM_Serif_Display, Outfit } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Aurora | Luxury Massage & Depilation Salon",
  description:
    "Dark, cinematic, and cozy. Experience ultra-luxury massage and depilation in an intimate sanctuary.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${dmSerif.variable} ${outfit.variable} font-sans min-h-screen`}
      >
        <Providers>
          {children}
          <Toaster theme="dark" position="bottom-center" />
        </Providers>
        <a
          href="/admin"
          className="fixed bottom-4 right-4 text-xs text-icyWhite/40 hover:text-icyWhite/70 transition-colors"
        >
          Admin
        </a>
      </body>
    </html>
  );
}
