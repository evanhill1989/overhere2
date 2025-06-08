import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/newSchema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL_IPV4!,
  },
});
