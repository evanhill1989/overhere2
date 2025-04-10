import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getUserByKindeId } from "@/src/db/queries/select";

import { NextResponse } from "next/server";
import { db } from "@/src/db/index";
import {
  InsertPost,
  InsertUser,
  postsTable,
  usersTable,
} from "@/src/db/schema";

export async function GET(request: Request) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  const dbUser = await getUserByKindeId(user.id);
  console.log("dbUser", dbUser);
  if (dbUser[0] === undefined) {
    console.log("!dbUser");
    await db
      .insert(usersTable)
      .values({ kinde_id: user.id, name: user.given_name, email: user.email });
  }

  return NextResponse.redirect(new URL("/", request.url));
}
