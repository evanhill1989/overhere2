// src/components/Footer.tsx

import Link from "next/link"; // Use Next.js Link for internal navigation if needed

export function Footer() {
  // Get the current year dynamically
  const currentYear = new Date().getFullYear();

  return (
    // Use mt-auto if the parent layout is a flex column to push footer down
    <footer className="w-full border-t border-gray-200 dark:border-gray-700 py-5 mt-auto">
      <div className="max-w-lg mx-auto px-4 text-center">
        {" "}
        {/* Constrain width and center text */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          &copy; {currentYear} overHere. Get off your phone. Meet people.
        </p>
        {/* Add links to essential pages - create these pages later */}
        <nav className="flex justify-center gap-x-4 gap-y-1 text-xs">
          <Link
            href="#"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:underline"
          >
            Privacy Policy
          </Link>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <Link
            href="#"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:underline"
          >
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
