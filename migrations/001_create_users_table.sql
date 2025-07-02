-- UP
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'moderator')),
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  email_verified BOOLEAN DEFAULT 0,
  email_verification_token TEXT,
  password_reset_token TEXT,
  password_reset_expires DATETIME
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- DOWN
DROP TABLE IF EXISTS users;