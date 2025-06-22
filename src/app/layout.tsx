// app/layout.tsx

import type { Metadata } from "next";
import { Lexend, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { createClient as createServerSupabaseClient } from "@/utils/supabase/server";
import { Header } from "@/components/Header";

const fontSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const fontHeading = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Over Here",
  description: "Connect spontaneously",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${fontHeading.variable} ${fontSans.variable} grid min-h-[100dvh] grid-rows-[auto_1fr_auto] antialiased`}
      >
        <Header userId={user?.id ?? null} />
        <main className="w-full">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
