import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { HandWaving } from "@phosphor-icons/react/dist/ssr";

// Define props for the component
interface HeaderProps {
  isLoggedIn: boolean;
}

// Keep this as a Server Component if possible
export function Header({ isLoggedIn }: HeaderProps) {
  return (
    // Added padding, adjusted border color for light/dark mode
    <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold font-heading dark:text-white">
          overhere
        </h1>
        <HandWaving size={40} />
      </div>

      <nav>
        {/* Conditional Rendering based on prop */}
        {isLoggedIn ? (
          <LogoutLink className="px-3 py-1.5 text-sm rounded text-primary hover:bg-red-50 dark:text-primary dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors">
            Log Out
          </LogoutLink>
        ) : (
          <LoginLink
            className="px-3 py-1.5 text-sm rounded text-primary hover:bg-blue-50 dark:text-primary dark:hover:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors" // Adjusted size/style
          >
            Sign In
          </LoginLink>
        )}
      </nav>
    </header>
  );
}
