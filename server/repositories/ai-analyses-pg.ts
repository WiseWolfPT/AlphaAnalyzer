// AI Analyses PostgreSQL Repository
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
    application_name: 'alfalyzer-ai-analyses'
  });
  await c.connect();
  client = c;
  return client;
}

export interface AIAnalysisRow {
  id: string;
  transcript_id: string;
  model_used: 'gpt-4o-mini' | 'gpt-3.5-turbo';
  analysis_type: 'summary' | 'sentiment' | 'metrics' | 'insights';
  content: any; // JSON content varies by analysis type
  confidence_score: number;
  tokens_used: number;
  cost_usd: number;
  created_at: string;
}

export interface CreateAIAnalysis {
  transcript_id: string;
  model_used: 'gpt-4o-mini' | 'gpt-3.5-turbo';
  analysis_type: 'summary' | 'sentiment' | 'metrics' | 'insights';
  content: any;
  confidence_score: number;
  tokens_used: number;
  cost_usd: number;
}

function generateId(): string {
  return 'ai_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const aiAnalysesPgRepo = {
  async create(data: CreateAIAnalysis): Promise<AIAnalysisRow | null> {
    const c = await getClient();
    const id = generateId();
    const q = `
      INSERT INTO ai_analyses (id, transcript_id, model_used, analysis_type, content, confidence_score, tokens_used, cost_usd, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *;
    `;
    const res = await c.query(q, [
      id,
      data.transcript_id,
      data.model_used,
      data.analysis_type,
      JSON.stringify(data.content),
      data.confidence_score,
      data.tokens_used,
      data.cost_usd
    ]);
    const row = res.rows?.[0];
    if (row) {
      row.content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
    }
    return row || null;
  },

  async getByTranscriptId(transcriptId: string): Promise<AIAnalysisRow[]> {
    const c = await getClient();
    const q = `
      SELECT * FROM ai_analyses
      WHERE transcript_id = $1
      ORDER BY created_at DESC;
    `;
    const res = await c.query(q, [transcriptId]);
    return res.rows.map(row => ({
      ...row,
      content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content
    }));
  },

  async getByTranscriptIdAndTypes(transcriptId: string, types: string[]): Promise<AIAnalysisRow[]> {
    const c = await getClient();
    const q = `
      SELECT * FROM ai_analyses
      WHERE transcript_id = $1 AND analysis_type = ANY($2)
      ORDER BY created_at DESC;
    `;
    const res = await c.query(q, [transcriptId, types]);
    return res.rows.map(row => ({
      ...row,
      content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content
    }));
  },

  async deleteById(id: string): Promise<boolean> {
    const c = await getClient();
    const q = `DELETE FROM ai_analyses WHERE id = $1`;
    const res = await c.query(q, [id]);
    return (res.rowCount || 0) > 0;
  },

  async getStats(): Promise<{
    totalAnalyses: number;
    totalCost: number;
    totalTokens: number;
    analysesByType: Record<string, number>;
    analysesByModel: Record<string, number>;
    recentActivity: Array<{
      date: string;
      count: number;
      cost: number;
    }>;
  }> {
    const c = await getClient();

    // Get total counts
    const totalQ = await c.query('SELECT COUNT(*)::int AS total, COALESCE(SUM(cost_usd),0)::float AS cost, COALESCE(SUM(tokens_used),0)::int AS tokens FROM ai_analyses');

    // Get by type
    const byTypeQ = await c.query('SELECT analysis_type, COUNT(*)::int AS c FROM ai_analyses GROUP BY analysis_type');

    // Get by model
    const byModelQ = await c.query('SELECT model_used, COUNT(*)::int AS c FROM ai_analyses GROUP BY model_used');

    // Get recent activity (last 7 days)
    const recentQ = await c.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*)::int as count,
        COALESCE(SUM(cost_usd),0)::float as cost
      FROM ai_analyses
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    const analysesByType: Record<string, number> = {};
    for (const r of byTypeQ.rows) analysesByType[r.analysis_type] = parseInt(r.c, 10);

    const analysesByModel: Record<string, number> = {};
    for (const r of byModelQ.rows) analysesByModel[r.model_used] = parseInt(r.c, 10);

    const recentActivity = recentQ.rows.map(r => ({
      date: r.date,
      count: parseInt(r.count, 10),
      cost: parseFloat(r.cost || 0)
    }));

    return {
      totalAnalyses: totalQ.rows?.[0]?.total || 0,
      totalCost: parseFloat(totalQ.rows?.[0]?.cost || 0),
      totalTokens: totalQ.rows?.[0]?.tokens || 0,
      analysesByType,
      analysesByModel,
      recentActivity
    };
  }
};