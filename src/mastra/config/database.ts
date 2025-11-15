/**
 * Database configuration
 * Runtime infrastructure config - not part of game state
 */

/**
 * Get PostgreSQL connection string for financial simulation
 * Reads from environment, never stored in game state
 * Returns null if DATABASE_URL is not defined (simulation will be skipped)
 */
export function getSimulationDatabaseUrl(): string | null {
  return process.env.DATABASE_URL || null;
}
