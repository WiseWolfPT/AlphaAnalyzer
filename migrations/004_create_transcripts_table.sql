-- UP
CREATE TABLE transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  quarter TEXT NOT NULL CHECK(quarter IN ('Q1', 'Q2', 'Q3', 'Q4', 'FY')),
  year INTEGER NOT NULL,
  call_date DATE,
  call_time TEXT,
  raw_transcript TEXT,
  ai_summary JSON,
  key_metrics JSON,
  sentiment_score REAL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'review', 'published', 'archived')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  published_by INTEGER,
  view_count INTEGER DEFAULT 0,
  FOREIGN KEY (ticker) REFERENCES stocks(symbol),
  FOREIGN KEY (published_by) REFERENCES users(id)
);

CREATE INDEX idx_transcripts_ticker ON transcripts(ticker);
CREATE INDEX idx_transcripts_status ON transcripts(status);
CREATE INDEX idx_transcripts_year_quarter ON transcripts(year, quarter);
CREATE INDEX idx_transcripts_published_at ON transcripts(published_at);

-- DOWN
DROP TABLE IF EXISTS transcripts;