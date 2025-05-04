import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { HandWaving } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Button } from "./ui/button";

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
        <ul className="flex items-center gap-4">
          {" "}
          {/* Use flex and gap for layout */}
          <li>
            {/* Your new About link */}
            <Link
              href="/about" // Or whatever your about page route is
              className="px-3 py-1.5 text-sm rounded text-foreground/80 hover:text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors" // Example styling - adjust as needed
            >
              About
            </Link>
          </li>
          <li>
            {isLoggedIn ? (
              <Button asChild>
                <LogoutLink className="">Log Out</LogoutLink>
              </Button>
            ) : (
              <Button asChild>
                <LoginLink className="">Log In</LoginLink>
              </Button>
            )}
          </li>
          {/* Add more <li> items here if needed later */}
        </ul>
      </nav>
    </header>
  );
}
