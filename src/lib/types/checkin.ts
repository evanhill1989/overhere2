import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { checkinsTable } from "@/lib/newSchema";

export type Checkin = InferSelectModel<typeof checkinsTable>;
export type NewCheckin = InferInsertModel<typeof checkinsTable>;
