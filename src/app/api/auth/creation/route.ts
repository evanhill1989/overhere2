import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import { NextResponse } from "next/server";

import { getUserByKindeId } from "@/db/queries/select";
import { usersTable } from "@/db/schema";
import { db } from "@/index";

export async function GET(request: Request) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  const dbUser = await getUserByKindeId(user.id!); // Assert user.id exists if checking before this
  console.log("dbUser", dbUser);

  if (dbUser[0] === undefined) {
    console.log("!dbUser - Creating new user entry");

    if (!user.id || !user.given_name || !user.email) {
      console.error(
        "Kinde user object is missing required fields (id, given_name, or email):",
        user
      );

      return;
    }

    await db.insert(usersTable).values({
      kinde_id: user.id,
      name: user.given_name,
      email: user.email,
    });
    console.log("New user inserted successfully.");
  }
  return NextResponse.redirect(new URL("/", request.url));
}
