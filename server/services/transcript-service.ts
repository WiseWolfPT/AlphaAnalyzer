/**
 * Transcript Service - Phase 3 Implementation
 * 
 * Service layer for transcript CRUD operations with Supabase integration
 */

import { db } from '../lib/supabase-admin';
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

  public static getInstance(): TranscriptService {
    if (!TranscriptService.instance) {
      TranscriptService.instance = new TranscriptService();
    }
    return TranscriptService.instance;
  }

  /**
   * Get all transcripts with optional filtering
   */
  async getTranscripts(filter: TranscriptFilter = {}): Promise<{ data: Transcript[], total: number }> {
    return await db.transcripts.getAll(filter);
  }

  /**
   * Get transcript by ID
   */
  async getTranscriptById(id: number): Promise<Transcript | null> {
    return await db.transcripts.getById(id);
  }

  /**
   * Create new transcript
   */
  async createTranscript(data: InsertTranscript): Promise<Transcript | null> {
    return await db.transcripts.create(data);
  }

  /**
   * Update transcript
   */
  async updateTranscript(id: number, data: UpdateTranscript): Promise<Transcript | null> {
    return await db.transcripts.update(id, data);
  }

  /**
   * Delete transcript
   */
  async deleteTranscript(id: number): Promise<boolean> {
    return await db.transcripts.delete(id);
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: number): Promise<void> {
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
    return await db.transcripts.getStats();
  }

  /**
   * Search transcripts by content
   */
  async searchTranscripts(query: string, limit: number = 10): Promise<Transcript[]> {
    return await db.transcripts.search(query, limit);
  }

  /**
   * Get recent transcripts
   */
  async getRecentTranscripts(limit: number = 5): Promise<Transcript[]> {
    return await db.transcripts.getRecent(limit);
  }

  /**
   * Get pending transcripts that need review
   */
  async getPendingTranscripts(): Promise<Transcript[]> {
    return await db.transcripts.getPending();
  }
}