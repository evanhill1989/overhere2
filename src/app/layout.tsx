import type { Metadata } from "next";
import { Nunito_Sans, Lexend } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { LocationPermissionProvider } from "@/context/LocationPermissionProvider"; // Import

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
  description: "Connect spontaneously", // Example description
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated } = getKindeServerSession();
  const isLoggedIn = await isAuthenticated();

  return (
    <html lang="en">
      <body
        className={`${fontHeading.variable} ${fontSans.variable} grid min-h-[100dvh] grid-rows-[auto_1fr_auto] antialiased`}
      >
        <Header isLoggedIn={isLoggedIn} />
        <main className="mx-auto w-full">
          {" "}
          {/* Ensure main can take width */}
          {isLoggedIn ? (
            <LocationPermissionProvider>{children}</LocationPermissionProvider>
          ) : (
            children // Render children directly if not logged in (e.g. landing page parts)
          )}
        </main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
