import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// 1. CHECK DATABASE URL
const rawDatabaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL;
if (!rawDatabaseUrl) {
  throw new Error("DATABASE_URL or DATABASE_PUBLIC_URL is missing in your environment");
}

// 2. CONNECT TO DATABASE (Neon)
const pool = new Pool({
  connectionString: rawDatabaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

const db = drizzle(pool);

// 3. CREATE SERVER
const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// 4. SIMPLE TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server is working");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    databaseConnected: true,
  });
});

// 5. START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
  console.log("Database URL loaded:", !!process.env.DATABASE_URL);
});
