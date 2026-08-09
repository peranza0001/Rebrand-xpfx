import { defineConfig } from "drizzle-kit";
import path from "path";

const databaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL or DATABASE_PUBLIC_URL must be set. Ensure the database is provisioned.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
