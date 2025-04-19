// src/components/Header.tsx (or wherever your Header component is)

import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";

// Define props for the component
interface HeaderProps {
  isLoggedIn: boolean;
}

// Keep this as a Server Component if possible
export function Header({ isLoggedIn }: HeaderProps) {
  return (
    // Added padding, adjusted border color for light/dark mode
    <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
      {/* Consider wrapping in a Link from next/link if it should navigate home */}
      <h1 className="text-lg font-bold dark:text-white">
        {" "}
        {/* Adjusted size for mobile */}
        overHere👋
      </h1>

      <nav>
        {/* Conditional Rendering based on prop */}
        {isLoggedIn ? (
          // User IS logged in: Show LogoutLink
          <LogoutLink
            className="px-3 py-1.5 text-sm rounded text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors" // Adjusted size/style
          >
            Log Out
          </LogoutLink>
        ) : (
          // User IS NOT logged in: Show LoginLink
          <LoginLink
            className="px-3 py-1.5 text-sm rounded text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors" // Adjusted size/style
          >
            Sign In
          </LoginLink>
        )}
      </nav>
    </header>
  );
}
