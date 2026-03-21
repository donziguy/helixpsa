import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Environment variables with defaults for local development
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://helixpsa:helixpsa_dev_password@localhost:5432/helixpsa';

// Connection pool configuration
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Drizzle instance with schema
export const db = drizzle(pool, { schema });

// Export pool for manual connection management if needed
export { pool };

// Helper function to test database connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('Database connected successfully:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeConnection() {
  await pool.end();
}