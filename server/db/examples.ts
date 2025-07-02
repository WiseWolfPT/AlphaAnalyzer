import { db, execute, transaction, getStatement, healthCheck, getDbInfo } from './index';
import type { Database } from 'better-sqlite3';

// Example 1: Simple query with execute wrapper
export async function getUserById(userId: number) {
  return execute(db => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(userId);
  });
}

// Example 2: Using prepared statements for better performance
export function getUserByEmail(email: string) {
  const stmt = getStatement('getUserByEmail');
  return stmt.get(email);
}

// Example 3: Insert with transaction
export async function createUserWithProfile(userData: any, profileData: any) {
  return transaction(db => {
    // Insert user
    const userStmt = db.prepare(`
      INSERT INTO users (email, password_hash, username, full_name)
      VALUES (?, ?, ?, ?)
    `);
    
    const userResult = userStmt.run(
      userData.email,
      userData.passwordHash,
      userData.username,
      userData.fullName
    );
    
    // Insert profile with user ID
    const profileStmt = db.prepare(`
      INSERT INTO user_profiles (user_id, bio, avatar_url)
      VALUES (?, ?, ?)
    `);
    
    profileStmt.run(
      userResult.lastInsertRowid,
      profileData.bio,
      profileData.avatarUrl
    );
    
    return { userId: userResult.lastInsertRowid };
  });
}

// Example 4: Complex query with joins
export async function getUserWatchlists(userId: number) {
  return execute(db => {
    const stmt = db.prepare(`
      SELECT 
        w.id,
        w.name,
        w.description,
        COUNT(ws.stock_symbol) as stock_count,
        GROUP_CONCAT(ws.stock_symbol) as symbols
      FROM watchlists w
      LEFT JOIN watchlist_stocks ws ON w.id = ws.watchlist_id
      WHERE w.user_id = ?
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `);
    
    return stmt.all(userId);
  });
}

// Example 5: Batch insert with transaction
export async function addStocksToWatchlist(watchlistId: number, symbols: string[]) {
  return transaction(db => {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO watchlist_stocks (watchlist_id, stock_symbol)
      VALUES (?, ?)
    `);
    
    const results = symbols.map(symbol => 
      stmt.run(watchlistId, symbol)
    );
    
    return {
      added: results.filter(r => r.changes > 0).length,
      skipped: results.filter(r => r.changes === 0).length
    };
  });
}

// Example 6: Update with audit log
export async function updateUserWithAudit(
  userId: number, 
  updates: any, 
  updatedBy: number
) {
  return transaction(db => {
    // Get current values
    const currentStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const currentUser = currentStmt.get(userId);
    
    if (!currentUser) {
      throw new Error('User not found');
    }
    
    // Update user
    const updateFields = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const updateStmt = db.prepare(`
      UPDATE users 
      SET ${updateFields}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    updateStmt.run(...Object.values(updates), userId);
    
    // Create audit log
    const auditStmt = db.prepare(`
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, 
        old_values, new_values
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    auditStmt.run(
      updatedBy,
      'update',
      'user',
      userId,
      JSON.stringify(currentUser),
      JSON.stringify(updates)
    );
    
    return { success: true };
  });
}

// Example 7: Search with pagination
export async function searchStocks(
  query: string, 
  page: number = 1, 
  pageSize: number = 20
) {
  return execute(db => {
    const offset = (page - 1) * pageSize;
    
    // Count total results
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total
      FROM stocks
      WHERE symbol LIKE ? OR name LIKE ?
    `);
    
    const { total } = countStmt.get(`%${query}%`, `%${query}%`) as any;
    
    // Get paginated results
    const searchStmt = db.prepare(`
      SELECT *
      FROM stocks
      WHERE symbol LIKE ? OR name LIKE ?
      ORDER BY 
        CASE 
          WHEN symbol = ? THEN 1
          WHEN symbol LIKE ? THEN 2
          WHEN name LIKE ? THEN 3
          ELSE 4
        END,
        symbol ASC
      LIMIT ? OFFSET ?
    `);
    
    const results = searchStmt.all(
      `%${query}%`, 
      `%${query}%`,
      query,
      `${query}%`,
      `${query}%`,
      pageSize,
      offset
    );
    
    return {
      results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  });
}

// Example 8: Aggregate statistics
export async function getPortfolioStats(portfolioId: number) {
  return execute(db => {
    const stmt = db.prepare(`
      SELECT 
        COUNT(DISTINCT ph.stock_symbol) as total_positions,
        SUM(ph.quantity * ph.average_price) as total_invested,
        SUM(
          ph.quantity * 
          COALESCE(
            (SELECT close FROM stock_prices 
             WHERE symbol = ph.stock_symbol 
             ORDER BY date DESC LIMIT 1),
            ph.average_price
          )
        ) as current_value,
        COUNT(DISTINCT pt.id) as total_transactions
      FROM portfolio_holdings ph
      LEFT JOIN portfolio_transactions pt ON ph.portfolio_id = pt.portfolio_id
      WHERE ph.portfolio_id = ?
    `);
    
    return stmt.get(portfolioId);
  });
}

// Example 9: Health check usage
export async function checkDatabaseHealth() {
  const isHealthy = await healthCheck();
  const info = getDbInfo();
  
  return {
    healthy: isHealthy,
    database: info,
    timestamp: new Date().toISOString()
  };
}

// Example 10: Cleanup old data
export async function cleanupOldData(daysToKeep: number = 30) {
  return transaction(db => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Clean old API cache
    const cacheStmt = db.prepare(`
      DELETE FROM api_cache 
      WHERE expires_at < ?
    `);
    const cacheResult = cacheStmt.run(cutoffDate.toISOString());
    
    // Clean old audit logs
    const auditStmt = db.prepare(`
      DELETE FROM audit_logs 
      WHERE created_at < ?
    `);
    const auditResult = auditStmt.run(cutoffDate.toISOString());
    
    // Clean expired sessions
    const sessionStmt = db.prepare(`
      DELETE FROM sessions 
      WHERE expired < ?
    `);
    const sessionResult = sessionStmt.run(new Date().toISOString());
    
    return {
      cacheDeleted: cacheResult.changes,
      auditDeleted: auditResult.changes,
      sessionsDeleted: sessionResult.changes
    };
  });
}