import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon serverless driver
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = true;
neonConfig.pipelineConnect = false;

// Configure SSL for production
if (process.env.NODE_ENV === 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Initializing database connection...");
console.log("Environment:", process.env.NODE_ENV);

// Add connection retry logic
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds
const INITIAL_BACKOFF = 1000; // 1 second

async function createPool() {
  let retries = 0;
  let lastError = null;

  while (retries < MAX_RETRIES) {
    try {
      console.log(`Attempt ${retries + 1}/${MAX_RETRIES} to connect to database...`);

      // Create pool with enhanced SSL and WebSocket configurations
      const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
          requestCert: true,
        },
        connectionTimeoutMillis: 10000,
        maxUses: 10000,
        idleTimeoutMillis: 30000
      });

      // Test the connection
      console.log("Testing database connection...");
      await pool.query('SELECT 1');
      console.log('Database connection established successfully');
      return pool;
    } catch (error) {
      lastError = error;
      retries++;
      console.error(`Failed to connect to database (attempt ${retries}/${MAX_RETRIES}):`, error);

      if (retries === MAX_RETRIES) {
        console.error("Maximum retries reached. Unable to establish database connection.");
        console.error("Last error:", lastError);
        throw new Error('Failed to connect to database after maximum retries');
      }

      // Exponential backoff
      const delay = INITIAL_BACKOFF * Math.pow(2, retries - 1);
      console.log(`Waiting ${delay/1000} seconds before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Failed to connect to database after maximum retries');
}

console.log("Starting database pool creation...");
export const pool = await createPool();
console.log("Database pool created successfully");

console.log("Initializing Drizzle ORM...");
export const db = drizzle({ client: pool, schema });
console.log("Drizzle ORM initialized successfully");