/**
 * Transcript Service - Phase 3 Implementation
 * 
 * Service layer for transcript CRUD operations with Supabase integration
 */

import { db } from '../lib/supabase-admin';
import { transcriptsPgRepo } from '../repositories/transcripts-pg';
import type { 
  Transcript, 
  InsertTranscript, 
  UpdateTranscript 
} from '../../shared/types/database';

export interface TranscriptFilter {
  ticker?: string;
  status?: 'pending' | 'review' | 'published' | 'archived';
  year?: number;
  quarter?: string;
  limit?: number;
  offset?: number;
}

export class TranscriptService {
  private static instance: TranscriptService;
  private usePg: boolean;

  public static getInstance(): TranscriptService {
    if (!TranscriptService.instance) {
      TranscriptService.instance = new TranscriptService();
    }
    return TranscriptService.instance;
  }

  private constructor() {
    this.usePg = !!process.env.PGHOST;
  }

  /**
   * Get all transcripts with optional filtering
   */
  async getTranscripts(filter: TranscriptFilter = {}): Promise<{ data: Transcript[], total: number }> {
    if (this.usePg) {
      const res = await transcriptsPgRepo.getAll(filter as any);
      return { data: res.data as any, total: res.total };
    }
    return await db.transcripts.getAll(filter);
  }

  /**
   * Get transcript by ID
   */
  async getTranscriptById(id: number): Promise<Transcript | null> {
    if (this.usePg) return await transcriptsPgRepo.getById(id) as any;
    return await db.transcripts.getById(id);
  }

  /**
   * Create new transcript
   */
  async createTranscript(data: InsertTranscript): Promise<Transcript | null> {
    if (this.usePg) {
      const id = await transcriptsPgRepo.upsertByKey(data as any);
      return id ? await transcriptsPgRepo.getById(id) as any : null;
    }
    return await db.transcripts.create(data);
  }

  /**
   * Update transcript
   */
  async updateTranscript(id: number, data: UpdateTranscript): Promise<Transcript | null> {
    if (this.usePg) {
      // Simple update
      const row = await transcriptsPgRepo.getById(id);
      if (!row) return null;
      const merged: any = { ...row, ...data };
      await transcriptsPgRepo.upsertByKey(merged);
      return await transcriptsPgRepo.getById(id) as any;
    }
    return await db.transcripts.update(id, data);
  }

  /**
   * Delete transcript
   */
  async deleteTranscript(id: number): Promise<boolean> {
    if (this.usePg) {
      const c = await (await import('pg')).Client; // soft
      // Not implementing delete for PG in this pass (not used by public routes)
      return false;
    }
    return await db.transcripts.delete(id);
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: number): Promise<void> {
    if (this.usePg) return await transcriptsPgRepo.incrementViewCount(id);
    await db.transcripts.incrementViewCount(id);
  }

  /**
   * Get transcript statistics
   */
  async getTranscriptStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byYear: Record<number, number>;
    totalViews: number;
    averageViews: number;
  }> {
    if (this.usePg) return await transcriptsPgRepo.getStats() as any;
    return await db.transcripts.getStats();
  }

  /**
   * Search transcripts by content
   */
  async searchTranscripts(query: string, limit: number = 10): Promise<Transcript[]> {
    if (this.usePg) return await transcriptsPgRepo.search(query, limit) as any;
    return await db.transcripts.search(query, limit);
  }

  /**
   * Get recent transcripts
   */
  async getRecentTranscripts(limit: number = 5): Promise<Transcript[]> {
    if (this.usePg) return await transcriptsPgRepo.getRecent(limit) as any;
    return await db.transcripts.getRecent(limit);
  }

  /**
   * Get pending transcripts that need review
   */
  async getPendingTranscripts(): Promise<Transcript[]> {
    if (this.usePg) return await transcriptsPgRepo.getPendingForSummary(20) as any;
    return await db.transcripts.getPending();
  }

  // New: Upsert by unique key
  async upsertByKey(data: InsertTranscript): Promise<number | null> {
    if (this.usePg) return await transcriptsPgRepo.upsertByKey(data as any);
    const created = await db.transcripts.create(data);
    return created?.id || null;
  }

  // New: Pending rows suited for summary pipeline
  async getPendingForSummary(limit = 20): Promise<any[]> {
    if (this.usePg) return await transcriptsPgRepo.getPendingForSummary(limit);
    const all = await db.transcripts.getPending();
    return all.slice(0, limit);
  }

  // New: Update summary + metadata atomically
  async updateSummaryMeta(id: number, ai_summary: string, status: string, metadata: any): Promise<void> {
    if (this.usePg) return await transcriptsPgRepo.updateSummaryMeta(id, ai_summary, status, metadata);
    await db.transcripts.update(id, { ai_summary, status, metadata: JSON.stringify(metadata || {}) } as any);
  }

  // New: Bulk update transcript status
  async bulkUpdateStatus(fromStatus: string, toStatus: string): Promise<number> {
    if (this.usePg) return await transcriptsPgRepo.bulkUpdateStatus(fromStatus, toStatus);
    // Fallback for Supabase (not implemented yet)
    return 0;
  }

  // New: Auto-publish reviewed transcripts with complete data
  async autoPublishReviewedTranscripts(): Promise<number> {
    if (this.usePg) return await transcriptsPgRepo.autoPublishReviewedTranscripts();
    // Fallback for Supabase (not implemented yet)
    return 0;
  }

  // New: Find transcript by unique key (ticker, quarter, year)
  async findByKey(ticker: string, quarter: string, year: number): Promise<Transcript | null> {
    if (this.usePg) return await transcriptsPgRepo.findByKey(ticker, quarter, year) as any;
    // Fallback for Supabase: filter by ticker/quarter/year
    const result = await db.transcripts.getAll({ ticker, quarter, year: year.toString() as any, limit: 1 });
    return result.data[0] || null;
  }

  // New: Alias for getTranscriptById (for worker compatibility)
  async findById(id: number): Promise<Transcript | null> {
    return this.getTranscriptById(id);
  }
}
