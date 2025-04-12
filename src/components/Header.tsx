import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";

export function Header() {
  return (
    <header className="flex justify-between items-center pb-2 border-b border-gray-300">
      <h1 className="text-xl font-bold">Check In App</h1>
      <nav className="flex gap-2">
        <LoginLink className="px-2 py-1 text-blue-600 hover:underline">
          Sign in
        </LoginLink>
        <LogoutLink className="px-2 py-1 text-red-600 hover:underline">
          Log Out
        </LogoutLink>
      </nav>
    </header>
  );
}
