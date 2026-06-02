import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/infrastructure/db/schema";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/appointments",
});

export const db = drizzle(pool, { schema });
