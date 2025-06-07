import type { Metadata } from "next";
import { Nunito_Sans, Lexend } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { LocationPermissionProvider } from "@/context/LocationPermissionProvider";

// Supabase Server Helpers
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

// Supabase Client Context for Client Components
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";

// Client-only Header (will use useUser())
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
  // Get user session server-side (for conditional logic or db access)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;

  // Create browser supabase client for use in SessionContextProvider
  const supabaseBrowserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return (
    <html lang="en">
      <body
        className={`${fontHeading.variable} ${fontSans.variable} grid min-h-[100dvh] grid-rows-[auto_1fr_auto] antialiased`}
      >
        <SessionContextProvider supabaseClient={supabaseBrowserClient}>
          <Header />
          <main className="w-full">
            {isLoggedIn ? (
              <LocationPermissionProvider>
                {children}
              </LocationPermissionProvider>
            ) : (
              children
            )}
          </main>
          <Footer />
          <Toaster />
        </SessionContextProvider>
      </body>
    </html>
  );
}
