```javascript
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Use DATABASE_URL from environment
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

// Create connection
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

console.log('Starting schema push...');

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Schema push completed successfully');
} catch (error) {
  console.error('Error pushing schema:', error);
  process.exit(1);
}

await sql.end();
```
