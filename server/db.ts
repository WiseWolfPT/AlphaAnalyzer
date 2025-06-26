import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

// For demo purposes, use SQLite
const dbPath = process.env.DATABASE_PATH || './dev.db';

// Inicializar SQLite com configurações de segurança
const sqlite = new Database(dbPath);

// CRÍTICO: Ativar foreign keys para garantir integridade referencial
sqlite.pragma('foreign_keys = ON');

// Configurações adicionais de segurança e performance
sqlite.pragma('journal_mode = WAL'); // Write-Ahead Logging para melhor concorrência
sqlite.pragma('synchronous = NORMAL'); // Balancear performance e segurança

export const db = drizzle(sqlite, { schema });

// Função segura para criar tabelas usando prepared statements
function createTables() {
  try {
    // 1. Tabela de stocks com tipos corretos para dados financeiros
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        price REAL NOT NULL, -- REAL para valores decimais precisos
        change REAL NOT NULL,
        change_percent REAL NOT NULL,
        market_cap REAL,
        sector TEXT,
        industry TEXT,
        eps REAL,
        pe_ratio REAL,
        logo TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (price >= 0), -- Constraint: preço não pode ser negativo
        CHECK (length(symbol) <= 10) -- Constraint: símbolo máximo 10 caracteres
      )
    `).run();

    // 2. Tabela de watchlists
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS watchlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (length(name) > 0 AND length(name) <= 100) -- Nome entre 1-100 chars
      )
    `).run();

    // 3. Tabela de relação watchlist-stocks com FOREIGN KEYS
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS watchlist_stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        watchlist_id INTEGER NOT NULL,
        stock_symbol TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
        FOREIGN KEY (stock_symbol) REFERENCES stocks(symbol) ON UPDATE CASCADE,
        UNIQUE(watchlist_id, stock_symbol) -- Evitar duplicatas
      )
    `).run();

    // 4. Tabela de valores intrínsecos com tipos numéricos apropriados
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS intrinsic_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stock_symbol TEXT NOT NULL,
        intrinsic_value REAL NOT NULL,
        current_price REAL NOT NULL,
        valuation TEXT NOT NULL CHECK (valuation IN ('undervalued', 'overvalued', 'fair')),
        delta_percent REAL NOT NULL,
        eps REAL NOT NULL,
        growth_rate REAL NOT NULL,
        pe_multiple REAL NOT NULL,
        required_return REAL NOT NULL,
        margin_of_safety REAL NOT NULL,
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stock_symbol) REFERENCES stocks(symbol) ON UPDATE CASCADE,
        CHECK (intrinsic_value >= 0),
        CHECK (current_price >= 0),
        CHECK (margin_of_safety >= 0 AND margin_of_safety <= 100)
      )
    `).run();

    // 5. Tabela de earnings com tipos corretos
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS earnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stock_symbol TEXT NOT NULL,
        date DATE NOT NULL,
        time TEXT NOT NULL,
        estimated_eps REAL,
        estimated_revenue REAL,
        actual_eps REAL,
        actual_revenue REAL,
        FOREIGN KEY (stock_symbol) REFERENCES stocks(symbol) ON UPDATE CASCADE,
        CHECK (time GLOB '[0-2][0-9]:[0-5][0-9]') -- Validar formato de hora HH:MM
      )
    `).run();

    // 6. Tabela de pesquisas recentes
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS recent_searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        user_id TEXT NOT NULL,
        searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 7. Tabela de logs de segurança (nova tabela para auditoria)
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT NOT NULL,
        resource TEXT,
        ip_address TEXT,
        user_agent TEXT,
        success INTEGER NOT NULL DEFAULT 1,
        details TEXT, -- JSON string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Criar índices para melhor performance
    createIndexes();

    console.log('✓ Database initialized with secure schema');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Função para criar índices de forma segura
function createIndexes() {
  const indexes = [
    // Índices para stocks
    'CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol)',
    'CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector)',
    
    // Índices para watchlists
    'CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id)',
    
    // Índices para watchlist_stocks
    'CREATE INDEX IF NOT EXISTS idx_watchlist_stocks_watchlist_id ON watchlist_stocks(watchlist_id)',
    'CREATE INDEX IF NOT EXISTS idx_watchlist_stocks_symbol ON watchlist_stocks(stock_symbol)',
    
    // Índices para intrinsic_values
    'CREATE INDEX IF NOT EXISTS idx_intrinsic_values_symbol ON intrinsic_values(stock_symbol)',
    'CREATE INDEX IF NOT EXISTS idx_intrinsic_values_date ON intrinsic_values(calculated_at)',
    
    // Índices para earnings
    'CREATE INDEX IF NOT EXISTS idx_earnings_symbol ON earnings(stock_symbol)',
    'CREATE INDEX IF NOT EXISTS idx_earnings_date ON earnings(date)',
    
    // Índices para recent_searches
    'CREATE INDEX IF NOT EXISTS idx_recent_searches_user_id ON recent_searches(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_recent_searches_symbol ON recent_searches(symbol)',
    
    // Índices para security_logs
    'CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at)'
  ];

  indexes.forEach(indexSql => {
    sqlite.prepare(indexSql).run();
  });
}

// Inicializar tabelas
createTables();

// Exportar funções utilitárias seguras para queries
export const dbUtils = {
  // Função segura para inserir stock
  insertStock: (stock: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    marketCap?: number;
    sector?: string;
    industry?: string;
    eps?: number;
    peRatio?: number;
    logo?: string;
  }) => {
    const stmt = sqlite.prepare(`
      INSERT OR REPLACE INTO stocks (
        symbol, name, price, change, change_percent, 
        market_cap, sector, industry, eps, pe_ratio, logo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      stock.symbol,
      stock.name,
      stock.price,
      stock.change,
      stock.changePercent,
      stock.marketCap || null,
      stock.sector || null,
      stock.industry || null,
      stock.eps || null,
      stock.peRatio || null,
      stock.logo || null
    );
  },

  // Função segura para buscar stock
  getStock: (symbol: string) => {
    const stmt = sqlite.prepare('SELECT * FROM stocks WHERE symbol = ?');
    return stmt.get(symbol);
  },

  // Função segura para log de segurança
  logSecurityEvent: (event: {
    user_id?: string;
    action: string;
    resource?: string;
    ip_address?: string;
    user_agent?: string;
    success: boolean;
    details?: any;
  }) => {
    const stmt = sqlite.prepare(`
      INSERT INTO security_logs (
        user_id, action, resource, ip_address, user_agent, success, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      event.user_id || null,
      event.action,
      event.resource || null,
      event.ip_address || null,
      event.user_agent || null,
      event.success ? 1 : 0,
      event.details ? JSON.stringify(event.details) : null
    );
  },

  // Função para executar transações de forma segura
  transaction: <T>(callback: () => T): T => {
    return sqlite.transaction(callback)();
  }
};

// Exportar instância do SQLite para casos específicos (com cuidado!)
export { sqlite };