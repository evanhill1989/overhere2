"use server";

import { db } from "@/index";
import { usersTable } from "../schema";

export type InsertUser = typeof usersTable.$inferInsert;

export async function createUser() {
  const user: InsertUser = {
    name: "Jon Doe",
    kinde_id: "kinde_id",
    email: "email",
  };

  await db.insert(usersTable).values(user);
}
