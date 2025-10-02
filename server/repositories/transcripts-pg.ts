// Transcripts PostgreSQL Repository
// Uses dynamic import of 'pg' to avoid hard dependency at compile time

type PgClient = any;

let client: PgClient | null = null;

async function getClient(): Promise<PgClient> {
  if (client) return client;
  const { Client } = await import('pg');
  const c = new Client({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    application_name: 'alfalyzer-transcripts'
  });
  await c.connect();
  client = c;
  return client;
}

export interface TranscriptRow {
  id: number;
  ticker: string;
  company_name: string;
  quarter: string;
  year: number;
  call_date: string | null;
  raw_transcript: string | null;
  ai_summary: string | null;
  status: string;
  created_at: string;
  published_at: string | null;
  view_count: number;
  metadata: any | null;
}

export interface TranscriptsFilter {
  ticker?: string;
  status?: string;
  year?: number;
  quarter?: string;
  limit?: number;
  offset?: number;
}

export const transcriptsPgRepo = {
  async upsertByKey(row: Partial<TranscriptRow>): Promise<number | null> {
    const c = await getClient();
    const q = `
      INSERT INTO transcripts (ticker, company_name, quarter, year, call_date, raw_transcript, ai_summary, status, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'{}'::jsonb))
      ON CONFLICT (ticker, year, quarter)
      DO UPDATE SET 
        company_name = EXCLUDED.company_name,
        call_date = COALESCE(EXCLUDED.call_date, transcripts.call_date),
        raw_transcript = COALESCE(EXCLUDED.raw_transcript, transcripts.raw_transcript),
        status = COALESCE(EXCLUDED.status, transcripts.status)
      RETURNING id;
    `;
    const res = await c.query(q, [
      (row.ticker || '').toUpperCase(),
      row.company_name || row.ticker || '',
      row.quarter || 'Q1',
      row.year || new Date().getUTCFullYear(),
      row.call_date || null,
      row.raw_transcript || null,
      row.ai_summary || null,
      row.status || 'pending',
      row.metadata ? JSON.stringify(row.metadata) : '{}'
    ]);
    return res.rows?.[0]?.id ?? null;
  },

  async getPendingForSummary(limit = 20): Promise<TranscriptRow[]> {
    const c = await getClient();
    const q = `
      SELECT id, ticker, company_name, quarter, year, call_date, raw_transcript, ai_summary, status, created_at, published_at, view_count, metadata
      FROM transcripts
      WHERE raw_transcript IS NOT NULL
        AND ai_summary IS NULL
        AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT $1;
    `;
    const res = await c.query(q, [limit]);
    return res.rows as TranscriptRow[];
  },

  async updateSummaryMeta(id: number, ai_summary: string, status: string, metadata: any): Promise<void> {
    const c = await getClient();
    const q = `
      UPDATE transcripts 
      SET ai_summary = $2, status = $3, metadata = COALESCE($4::jsonb, metadata)
      WHERE id = $1;
    `;
    await c.query(q, [id, ai_summary, status, JSON.stringify(metadata || {})]);
  },

  async getAll(filter: TranscriptsFilter = {}): Promise<{ data: TranscriptRow[]; total: number }> {
    const c = await getClient();
    const where: string[] = [];
    const params: any[] = [];
    let p = 1;
    if (filter.ticker) { where.push(`ticker ILIKE $${p++}`); params.push(`%${filter.ticker}%`); }
    if (filter.status) { where.push(`status = $${p++}`); params.push(filter.status); }
    if (filter.year) { where.push(`year = $${p++}`); params.push(filter.year); }
    if (filter.quarter) { where.push(`quarter = $${p++}`); params.push(filter.quarter); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    const q = `
      SELECT * FROM transcripts
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${p} OFFSET $${p+1};
    `;
    const qCount = `SELECT COUNT(*)::int AS c FROM transcripts ${whereSql};`;
    const res = await c.query(q, [...params, limit, offset]);
    const resCount = await c.query(qCount, params);
    return { data: res.rows as TranscriptRow[], total: resCount.rows?.[0]?.c || 0 };
  },

  async getById(id: number): Promise<TranscriptRow | null> {
    const c = await getClient();
    const res = await c.query('SELECT * FROM transcripts WHERE id = $1', [id]);
    return res.rows?.[0] || null;
  },

  async incrementViewCount(id: number): Promise<void> {
    const c = await getClient();
    await c.query('UPDATE transcripts SET view_count = COALESCE(view_count,0) + 1 WHERE id = $1', [id]);
  },

  async getRecent(limit = 5): Promise<TranscriptRow[]> {
    const c = await getClient();
    const res = await c.query(
      "SELECT * FROM transcripts WHERE status = 'published' ORDER BY COALESCE(published_at, created_at) DESC LIMIT $1",
      [limit]
    );
    return res.rows as TranscriptRow[];
  },

  async search(query: string, limit = 10): Promise<TranscriptRow[]> {
    const c = await getClient();
    const term = `%${query.toLowerCase()}%`;
    const res = await c.query(
      'SELECT * FROM transcripts WHERE LOWER(ticker) ILIKE $1 OR LOWER(company_name) ILIKE $1 OR (ai_summary::text) ILIKE $1 LIMIT $2',
      [term, limit]
    );
    return res.rows as TranscriptRow[];
  },

  async getStats(): Promise<{ total: number; byStatus: Record<string, number>; byYear: Record<number, number>; totalViews: number; averageViews: number; }> {
    const c = await getClient();
    const totalQ = await c.query('SELECT COUNT(*)::int AS c FROM transcripts');
    const byStatusQ = await c.query('SELECT status, COUNT(*)::int AS c FROM transcripts GROUP BY status');
    const byYearQ = await c.query('SELECT year, COUNT(*)::int AS c FROM transcripts GROUP BY year');
    const viewsQ = await c.query('SELECT COALESCE(SUM(view_count),0)::int AS v, COALESCE(AVG(view_count),0)::float AS a FROM transcripts');
    const byStatus: Record<string, number> = {};
    for (const r of byStatusQ.rows) byStatus[r.status] = parseInt(r.c, 10);
    const byYear: Record<number, number> = {};
    for (const r of byYearQ.rows) byYear[r.year] = parseInt(r.c, 10);
    return {
      total: totalQ.rows?.[0]?.c || 0,
      byStatus,
      byYear,
      totalViews: viewsQ.rows?.[0]?.v || 0,
      averageViews: parseFloat(viewsQ.rows?.[0]?.a || 0)
    };
  },

  async bulkUpdateStatus(fromStatus: string, toStatus: string): Promise<number> {
    const c = await getClient();
    const q = `
      UPDATE transcripts
      SET status = $2, published_at = CASE WHEN $2 = 'published' THEN NOW() ELSE published_at END
      WHERE status = $1 AND ai_summary IS NOT NULL
      RETURNING id;
    `;
    const res = await c.query(q, [fromStatus, toStatus]);
    return res.rowCount || 0;
  },

  async autoPublishReviewedTranscripts(): Promise<number> {
    const c = await getClient();
    const q = `
      UPDATE transcripts
      SET status = 'published', published_at = NOW()
      WHERE status = 'review'
        AND ai_summary IS NOT NULL
        AND raw_transcript IS NOT NULL
      RETURNING id;
    `;
    const res = await c.query(q);
    return res.rowCount || 0;
  }
};
