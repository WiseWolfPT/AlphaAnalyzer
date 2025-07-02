# Database Layer Documentation

## Overview

This database layer provides a robust connection pool and migration system for the Alfalyzer application using `better-sqlite3`.

## Features

### Connection Pool (`/server/db/index.ts`)
- **WAL Mode**: Enables Write-Ahead Logging for better concurrent performance
- **Auto-retry**: 3 retry attempts with 1-second delay for failed connections
- **Prepared Statements**: Common queries are pre-compiled for better performance
- **Health Checks**: Built-in database health monitoring
- **Graceful Shutdown**: Properly closes connections on process termination

### Migration System (`/server/db/migrations.ts`)
- **Version Control**: Track all database schema changes
- **Checksums**: Detect if migrations were modified after execution
- **Rollback Support**: Undo migrations with DOWN scripts
- **Status Tracking**: See which migrations have been applied

## Usage

### Database Connection

```typescript
import { db, execute, transaction } from './server/db';

// Simple query
const user = execute(db => 
  db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
);

// Using prepared statements
import { getStatement } from './server/db';
const stmt = getStatement('getUserById');
const user = stmt.get(userId);

// Transaction
const result = await transaction(db => {
  const stmt1 = db.prepare('INSERT INTO users...');
  const stmt2 = db.prepare('INSERT INTO profiles...');
  
  stmt1.run(...);
  stmt2.run(...);
  
  return { success: true };
});
```

### Migrations

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:rollback

# Rollback multiple migrations
npm run migrate:down 3
```

### Creating New Migrations

1. Create a new SQL file in `/migrations/` directory
2. Name it with format: `XXX_description.sql` (e.g., `007_add_user_preferences.sql`)
3. Include UP and DOWN sections:

```sql
-- UP
CREATE TABLE user_preferences (
  user_id INTEGER PRIMARY KEY,
  theme TEXT DEFAULT 'light',
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- DOWN
DROP TABLE user_preferences;
```

## Performance Optimizations

1. **WAL Mode**: Allows concurrent reads while writing
2. **Memory Cache**: 64MB in-memory cache for frequently accessed data
3. **Memory Temp Store**: Temporary tables stored in memory
4. **MMAP**: 30GB memory-mapped I/O for large databases
5. **Prepared Statements**: Pre-compiled queries for common operations

## Error Handling

The connection pool automatically handles:
- Connection failures with retry logic
- Broken connections with automatic reconnection
- Transaction rollbacks on errors
- Graceful shutdown on process termination

## Environment Variables

- `DATABASE_PATH`: Custom database file path (default: `./data/alfalyzer.db`)
- `NODE_ENV`: Set to 'development' for verbose logging