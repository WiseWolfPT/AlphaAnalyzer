import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'alfalyzer.db');
const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

interface Migration {
  id: string;
  name: string;
  up: string;
  down?: string;
  timestamp: number;
}

interface MigrationRecord {
  id: string;
  name: string;
  executed_at: string;
  checksum: string;
}

class MigrationRunner {
  private db: Database.Database;

  constructor() {
    // Ensure database directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create database connection
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    // Create migrations table if it doesn't exist
    this.createMigrationsTable();
  }

  private createMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT NOT NULL
      );
    `);
  }

  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async loadMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = [];

    // Ensure migrations directory exists
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }

    // Read all SQL files from migrations directory
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Parse migration file
      const parts = content.split('-- DOWN');
      const up = parts[0].replace('-- UP', '').trim();
      const down = parts[1]?.trim();

      // Extract timestamp and name from filename (e.g., 001_create_users_table.sql)
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        console.warn(`Skipping invalid migration filename: ${file}`);
        continue;
      }

      migrations.push({
        id: match[1],
        name: match[2],
        up,
        down,
        timestamp: parseInt(match[1])
      });
    }

    return migrations.sort((a, b) => a.timestamp - b.timestamp);
  }

  private getExecutedMigrations(): MigrationRecord[] {
    return this.db.prepare('SELECT * FROM migrations ORDER BY id').all() as MigrationRecord[];
  }

  async up(): Promise<void> {
    console.log('Running migrations...');
    
    const migrations = await this.loadMigrations();
    const executed = this.getExecutedMigrations();
    const executedIds = new Set(executed.map(m => m.id));

    let count = 0;
    
    for (const migration of migrations) {
      if (executedIds.has(migration.id)) {
        // Verify checksum
        const record = executed.find(e => e.id === migration.id)!;
        const currentChecksum = this.calculateChecksum(migration.up);
        
        if (record.checksum !== currentChecksum) {
          throw new Error(
            `Migration ${migration.id}_${migration.name} has been modified after execution! ` +
            `This is dangerous and not allowed.`
          );
        }
        
        continue;
      }

      console.log(`Executing migration: ${migration.id}_${migration.name}`);
      
      try {
        // Execute migration in a transaction
        this.db.transaction(() => {
          // Execute the migration
          this.db.exec(migration.up);
          
          // Record the migration
          const stmt = this.db.prepare(`
            INSERT INTO migrations (id, name, checksum) 
            VALUES (?, ?, ?)
          `);
          
          stmt.run(
            migration.id, 
            migration.name,
            this.calculateChecksum(migration.up)
          );
        })();
        
        count++;
        console.log(`✓ Migration ${migration.id}_${migration.name} completed`);
      } catch (error) {
        console.error(`✗ Migration ${migration.id}_${migration.name} failed:`, error);
        throw error;
      }
    }

    if (count === 0) {
      console.log('No new migrations to run');
    } else {
      console.log(`Successfully ran ${count} migration(s)`);
    }
  }

  async down(steps: number = 1): Promise<void> {
    console.log(`Rolling back ${steps} migration(s)...`);
    
    const migrations = await this.loadMigrations();
    const executed = this.getExecutedMigrations()
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, steps);

    if (executed.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    let count = 0;

    for (const record of executed) {
      const migration = migrations.find(m => m.id === record.id);
      
      if (!migration) {
        console.warn(`Migration ${record.id}_${record.name} not found in migrations directory`);
        continue;
      }

      if (!migration.down) {
        console.warn(`Migration ${migration.id}_${migration.name} has no DOWN script`);
        continue;
      }

      console.log(`Rolling back migration: ${migration.id}_${migration.name}`);
      
      try {
        // Execute rollback in a transaction
        this.db.transaction(() => {
          // Execute the rollback
          this.db.exec(migration.down!);
          
          // Remove the migration record
          const stmt = this.db.prepare('DELETE FROM migrations WHERE id = ?');
          stmt.run(migration.id);
        })();
        
        count++;
        console.log(`✓ Rollback ${migration.id}_${migration.name} completed`);
      } catch (error) {
        console.error(`✗ Rollback ${migration.id}_${migration.name} failed:`, error);
        throw error;
      }
    }

    console.log(`Successfully rolled back ${count} migration(s)`);
  }

  async status(): Promise<void> {
    const migrations = await this.loadMigrations();
    const executed = this.getExecutedMigrations();
    const executedIds = new Set(executed.map(m => m.id));

    console.log('\nMigration Status:');
    console.log('=================');
    
    for (const migration of migrations) {
      const isExecuted = executedIds.has(migration.id);
      const status = isExecuted ? '✓' : '✗';
      const record = executed.find(e => e.id === migration.id);
      
      console.log(`${status} ${migration.id}_${migration.name}`);
      
      if (record) {
        console.log(`  Executed at: ${record.executed_at}`);
      }
    }

    const pending = migrations.filter(m => !executedIds.has(m.id));
    console.log(`\nTotal: ${migrations.length} | Executed: ${executed.length} | Pending: ${pending.length}`);
  }

  close(): void {
    this.db.close();
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const runner = new MigrationRunner();

  try {
    switch (command) {
      case 'up':
        await runner.up();
        break;
      
      case 'down':
        const steps = parseInt(process.argv[3] || '1');
        await runner.down(steps);
        break;
      
      case 'status':
        await runner.status();
        break;
      
      default:
        console.log('Usage:');
        console.log('  npm run migrate         # Run all pending migrations');
        console.log('  npm run migrate:status  # Show migration status');
        console.log('  npm run migrate:down    # Rollback last migration');
        console.log('  npm run migrate:down 3  # Rollback last 3 migrations');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    runner.close();
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { MigrationRunner };