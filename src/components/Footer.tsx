// src/components/Footer.tsx

import Link from "next/link"; // Use Next.js Link for internal navigation if needed

export function Footer() {
  // Get the current year dynamically
  const currentYear = new Date().getFullYear();

  return (
    // Use mt-auto if the parent layout is a flex column to push footer down
    <footer className="mt-auto w-full border-t border-gray-200 py-5 dark:border-gray-700">
      <div className="mx-auto max-w-lg px-4 text-center">
        {" "}
        {/* Constrain width and center text */}
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          &copy; {currentYear} overHere. Get off your phone. Meet people.
        </p>
        {/* Add links to essential pages - create these pages later */}
        <nav className="justify-center gap-x-4 gap-y-1 text-xs sm:hidden md:flex">
          <Link
            href="#"
            className="text-gray-600 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-white"
          >
            Privacy Policy
          </Link>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <Link
            href="#"
            className="text-gray-600 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-white"
          >
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
