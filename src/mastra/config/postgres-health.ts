import { Pool } from "pg";
import { getSimulationDatabaseUrl } from "./database.ts";

let healthPool: Pool | null = null;

export async function checkPostgresHealth(): Promise<boolean> {
  const connectionString = getSimulationDatabaseUrl();

  if (!connectionString) {
    return false;
  }

  if (!healthPool) {
    healthPool = new Pool({
      connectionString,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 2000,
    });
  }

  try {
    await healthPool.query("SELECT 1=1");
    return true;
  } catch (error) {
    console.error("❌ Postgres health check failed:", error);
    return false;
  }
}
