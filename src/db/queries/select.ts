import { eq } from "drizzle-orm";
import { db } from "@/lib/db";

import { usersTable, SelectUser } from "../oldSchema";

export async function getUserById(id: SelectUser["id"]): Promise<
  Array<{
    id: number;
    kinde_id: string;
    name: string;
    email: string;
  }>
> {
  return db.select().from(usersTable).where(eq(usersTable.id, id));
}

export async function getUserByKindeId(
  kinde_id: SelectUser["kinde_id"],
): Promise<
  Array<{
    id: number;
    kinde_id: string;
    name: string | null;

    email: string | null;
  }>
> {
  return db.select().from(usersTable).where(eq(usersTable.kinde_id, kinde_id));
}

// export async function getUsersWithPostsCount(
//   page = 1,
//   pageSize = 5
// ): Promise<
//   Array<{
//     postsCount: number;
//     id: number;
//     name: string;
//     age: number;
//     email: string;
//   }>
// > {
//   return db
//     .select({
//       ...getTableColumns(usersTable),
//       postsCount: count(postsTable.id),
//     })
//     .from(usersTable)
//     .leftJoin(postsTable, eq(usersTable.id, postsTable.userId))
//     .groupBy(usersTable.id)
//     .orderBy(asc(usersTable.id))
//     .limit(pageSize)
//     .offset((page - 1) * pageSize);
// }

// export async function getPostsForLast24Hours(
//   page = 1,
//   pageSize = 5
// ): Promise<
//   Array<{
//     id: number;
//     title: string;
//   }>
// > {
//   return db
//     .select({
//       id: postsTable.id,
//       title: postsTable.title,
//     })
//     .from(postsTable)
//     .where(
//       between(postsTable.createdAt, sql`now() - interval '1 day'`, sql`now()`)
//     )
//     .orderBy(asc(postsTable.title), asc(postsTable.id))
//     .limit(pageSize)
//     .offset((page - 1) * pageSize);
// }
