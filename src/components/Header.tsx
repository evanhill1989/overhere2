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

    <header className="z-5001 border-b border-gray-200 dark:border-gray-700">
      <div className="wrapper flex items-center justify-between py-3 md:py-4">
        <Link href="/" passHref legacyBehavior={false}>
          <div className="group flex items-center gap-2">
            <h1 className="font-heading active:underline active:underline-offset-2">
              overhere
            </h1>

            <div className="icon-wrapper group-hover:animate-wave-hover origin-[appropriate-for-wrapper]">
              <HandWaving className="animate-wave-load h-5 w-5 origin-[appropriate-for-icon] ..." />
            </div>
          </div>
        </Link>

        <nav>
          <ul className="flex items-center gap-4">
            {" "}
            {/* Use flex and gap for layout */}
            <li>
              {/* Your new About link */}
              <Link
                href="/about" // Or whatever your about page route is
                className="text-foreground/80 hover:text-primary hover:bg-primary/10 focus:ring-primary rounded px-3 py-1.5 text-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none" // Example styling - adjust as needed
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
      </div>
    </header>
  );
}
