import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// WebSocket configuration with enhanced logging
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.wsProxy = (url) => {
  console.log('WebSocket connection attempt:', {
    url,
    timestamp: new Date().toISOString(),
    secure: neonConfig.useSecureWebSocket
  });
  return url;
};

// SSL configuration with proper error handling
try {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('SSL verification disabled for development');
} catch (error: any) {
  console.error('Error configuring SSL:', error.message);
}

// Environment-based configuration with production-optimized defaults
const MAX_RETRIES = parseInt(process.env.DB_MAX_RETRIES || '5');
const INITIAL_BACKOFF = parseInt(process.env.DB_INITIAL_BACKOFF || '500');
const MAX_BACKOFF = parseInt(process.env.DB_MAX_BACKOFF || '5000');
const CONNECTION_TIMEOUT = parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000');
const POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || '5');

console.log('Database configuration:', {
  MAX_RETRIES,
  INITIAL_BACKOFF,
  MAX_BACKOFF,
  CONNECTION_TIMEOUT,
  POOL_SIZE,
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL_SET: !!process.env.DATABASE_URL
});

if (!process.env.DATABASE_URL) {
  console.error('Fatal: DATABASE_URL is not defined');
  process.exit(1);
}

// Pool initialization function
async function initializePool(): Promise<Pool> {
  let retries = 0;
  let lastError: Error | null = null;

  const startTime = Date.now();
  console.log('Starting database connection process at:', new Date().toISOString());

  while (retries < MAX_RETRIES) {
    const attemptStartTime = Date.now();
    try {
      console.log(`Connection attempt ${retries + 1}/${MAX_RETRIES}`, {
        elapsedTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });

      const newPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: CONNECTION_TIMEOUT,
        maxUses: 5000,
        idleTimeoutMillis: 10000,
        max: POOL_SIZE
      });

      console.log('Pool created, testing connection...');

      // Test connection with timeout
      const connectPromise = newPool.query('SELECT 1');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT);
      });

      await Promise.race([connectPromise, timeoutPromise]);

      console.log('Database connection successful', {
        attempt: retries + 1,
        duration: Date.now() - attemptStartTime
      });

      return newPool;

    } catch (error: any) {
      lastError = new Error(error.message);
      retries++;

      const errorDetails = {
        name: error.name,
        message: error.message,
        code: error.code,
        attempt: retries,
        duration: Date.now() - attemptStartTime,
        totalElapsed: Date.now() - startTime
      };

      console.error('Connection attempt failed:', errorDetails);

      if (retries >= MAX_RETRIES) {
        console.error('Maximum retries reached', errorDetails);
        throw new Error(`Database connection failed after ${MAX_RETRIES} attempts: ${error.message}`);
      }

      const baseDelay = Math.min(INITIAL_BACKOFF * Math.pow(1.5, retries - 1), MAX_BACKOFF);
      const jitter = Math.random() * 0.1 * baseDelay;
      const delay = baseDelay + jitter;

      console.log(`Retrying in ${delay}ms`, {
        baseDelay,
        jitter,
        attempt: retries
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Failed to create pool after all retries');
}

// Initialize database connection
let pool: Pool;

export async function getPool(): Promise<Pool> {
  if (!pool) {
    pool = await initializePool();
  }
  return pool;
}

// Health check function with shorter timeout
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const currentPool = await getPool();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), 3000);
    });
    const queryPromise = currentPool.query('SELECT 1');

    await Promise.race([queryPromise, timeoutPromise]);
    return true;
  } catch (error: any) {
    console.error('Health check failed:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

// Initialize Drizzle ORM
console.log('Initializing Drizzle ORM...');
export const db = drizzle((await getPool()) as any, { schema });
console.log('Drizzle ORM initialized successfully');

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, initiating graceful shutdown...');
  try {
    if (pool) {
      await pool.end();
      console.log('Database connections closed successfully');
    }
  } catch (error: any) {
    console.error('Error during graceful shutdown:', error.message);
  }
  process.exit(0);
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', {
    promise,
    reason,
    timestamp: new Date().toISOString()
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  setTimeout(() => process.exit(1), 1000);
});