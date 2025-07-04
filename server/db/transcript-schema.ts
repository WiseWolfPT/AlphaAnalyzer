/**
 * Transcript Database Schema - Roadmap V4
 * 
 * SQLite schema for transcript management in admin panel
 */

export interface Transcript {
  id?: number;
  ticker: string;
  company_name: string;
  quarter: string;
  year: number;
  call_date?: string;
  raw_transcript?: string;
  ai_summary?: string;
  status: 'pending' | 'review' | 'published' | 'archived';
  created_at?: string;
  published_at?: string;
  view_count: number;
  metadata?: string; // JSON string for additional metadata
}

export interface TranscriptCreate {
  ticker: string;
  company_name: string;
  quarter: string;
  year: number;
  call_date?: string;
  raw_transcript?: string;
  ai_summary?: string;
  status?: 'pending' | 'review' | 'published' | 'archived';
}

export interface TranscriptUpdate {
  id: number;
  ticker?: string;
  company_name?: string;
  quarter?: string;
  year?: number;
  call_date?: string;
  raw_transcript?: string;
  ai_summary?: string;
  status?: 'pending' | 'review' | 'published' | 'archived';
  published_at?: string;
}

export interface TranscriptFilter {
  ticker?: string;
  status?: string;
  year?: number;
  quarter?: string;
  limit?: number;
  offset?: number;
}

// Mock data for development
export const mockTranscripts: Transcript[] = [
  {
    id: 1,
    ticker: 'AAPL',
    company_name: 'Apple Inc.',
    quarter: 'Q4',
    year: 2024,
    call_date: '2024-01-25',
    raw_transcript: 'Apple Inc. Q4 2024 Earnings Call Transcript...',
    ai_summary: 'Apple reported strong Q4 results with iPhone sales exceeding expectations...',
    status: 'published',
    created_at: '2024-01-26T10:00:00Z',
    published_at: '2024-01-26T15:00:00Z',
    view_count: 234,
    metadata: JSON.stringify({ source: 'MarketBeat', analyst_ratings: 5 })
  },
  {
    id: 2,
    ticker: 'GOOGL',
    company_name: 'Alphabet Inc.',
    quarter: 'Q4',
    year: 2024,
    call_date: '2024-01-30',
    raw_transcript: 'Alphabet Inc. Q4 2024 Earnings Call Transcript...',
    ai_summary: 'Google showed strong growth in cloud services and AI initiatives...',
    status: 'review',
    created_at: '2024-01-31T09:00:00Z',
    view_count: 0,
    metadata: JSON.stringify({ source: 'MarketBeat', analyst_ratings: 4 })
  },
  {
    id: 3,
    ticker: 'MSFT',
    company_name: 'Microsoft Corporation',
    quarter: 'Q1',
    year: 2025,
    call_date: '2025-01-15',
    raw_transcript: '',
    ai_summary: '',
    status: 'pending',
    created_at: '2025-01-16T08:00:00Z',
    view_count: 0,
    metadata: JSON.stringify({ source: 'Seeking Alpha', analyst_ratings: 5 })
  }
];