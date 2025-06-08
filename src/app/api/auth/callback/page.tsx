// app/auth/callback/page.tsx
import { redirect } from "next/navigation";

export default function Page() {
  console.log("page running!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  redirect("/?r=1");
}
