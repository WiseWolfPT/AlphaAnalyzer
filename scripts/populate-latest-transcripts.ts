import { config } from 'dotenv';
import { resolve } from 'path';
import { TranscriptService } from '../server/services/transcript-service';

// Load environment
const envPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(process.cwd(), envPath) });

const UNIVERSE = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
  'JPM', 'V', 'JNJ', 'WMT', 'PG', 'UNH', 'HD', 'MA', 'DIS',
  'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC', 'AMD', 'BA', 'NKE',
  'PFE', 'CSCO', 'XOM', 'CVX', 'ABBV', 'TMO', 'ACN', 'COST'
];

const transcriptService = TranscriptService.getInstance();

async function fetchJson(url: string): Promise<any> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  try { return await r.json(); } catch { return null; }
}

async function fetchFmpTranscript(symbol: string, quarter: string, year: number): Promise<string | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;
  const qn = quarter.replace('Q','');
  const url = `https://financialmodelingprep.com/api/v3/earning_call_transcript/${encodeURIComponent(symbol)}?quarter=${encodeURIComponent(qn)}&year=${encodeURIComponent(String(year))}&apikey=${apiKey}`;
  try {
    const data = await fetchJson(url);
    if (Array.isArray(data) && data[0]?.content) return String(data[0].content);
    if (data && typeof data === 'object' && data.content) return String(data.content);
    return null;
  } catch (e) {
    console.warn('FMP transcript fetch failed', { symbol, quarter, year, error: (e as any)?.message });
    return null;
  }
}

async function fetchLatestTranscriptForSymbol(symbol: string): Promise<{content: string, quarter: string, year: number} | null> {
  // Ordem correta para setembro 2025
  const quarters = [
    { quarter: 'Q2', year: 2025 }, // Mais recente disponível
    { quarter: 'Q1', year: 2025 },
    { quarter: 'Q4', year: 2024 },
    { quarter: 'Q3', year: 2024 }
  ];

  for (const {quarter, year} of quarters) {
    try {
      const content = await fetchFmpTranscript(symbol, quarter, year);
      if (content) {
        console.log(`✅ Found ${symbol} transcript: ${quarter} ${year}`);
        return { content, quarter, year };
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function populateAllLatestTranscripts() {
  console.log('🚀 Iniciando população de últimos transcripts...');

  for (const symbol of UNIVERSE) {
    console.log(`\n📊 Processando ${symbol}...`);

    // Buscar último transcript disponível
    const latest = await fetchLatestTranscriptForSymbol(symbol);

    if (latest) {
      // Salvar no DB
      await transcriptService.upsertByKey({
        ticker: symbol,
        company_name: symbol,
        quarter: latest.quarter,
        year: latest.year,
        raw_transcript: latest.content,
        status: 'pending', // Para AI processar
        call_date: null
      });

      console.log(`✅ ${symbol}: Saved ${latest.quarter} ${latest.year}`);
    } else {
      console.log(`❌ ${symbol}: No transcript found`);
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n✅ População inicial completa!');
}

// Executar imediatamente
populateAllLatestTranscripts().catch(console.error);