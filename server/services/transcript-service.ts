/**
 * Transcript Service - Roadmap V4
 * 
 * Service layer for transcript CRUD operations with SQLite mock implementation
 */

import { 
  Transcript, 
  TranscriptCreate, 
  TranscriptUpdate, 
  TranscriptFilter, 
  mockTranscripts 
} from '../db/transcript-schema';

export class TranscriptService {
  private static instance: TranscriptService;
  private transcripts: Transcript[] = [...mockTranscripts];
  private nextId = 4; // Start after mock data

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
    let filteredTranscripts = [...this.transcripts];

    // Apply filters
    if (filter.ticker) {
      filteredTranscripts = filteredTranscripts.filter(t => 
        t.ticker.toLowerCase().includes(filter.ticker!.toLowerCase())
      );
    }

    if (filter.status) {
      filteredTranscripts = filteredTranscripts.filter(t => t.status === filter.status);
    }

    if (filter.year) {
      filteredTranscripts = filteredTranscripts.filter(t => t.year === filter.year);
    }

    if (filter.quarter) {
      filteredTranscripts = filteredTranscripts.filter(t => t.quarter === filter.quarter);
    }

    // Sort by created_at desc
    filteredTranscripts.sort((a, b) => 
      new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );

    const total = filteredTranscripts.length;

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    const paginatedTranscripts = filteredTranscripts.slice(offset, offset + limit);

    return {
      data: paginatedTranscripts,
      total
    };
  }

  /**
   * Get transcript by ID
   */
  async getTranscriptById(id: number): Promise<Transcript | null> {
    const transcript = this.transcripts.find(t => t.id === id);
    return transcript || null;
  }

  /**
   * Create new transcript
   */
  async createTranscript(data: TranscriptCreate): Promise<Transcript> {
    const newTranscript: Transcript = {
      id: this.nextId++,
      ...data,
      status: data.status || 'pending',
      view_count: 0,
      created_at: new Date().toISOString(),
    };

    this.transcripts.push(newTranscript);
    return newTranscript;
  }

  /**
   * Update transcript
   */
  async updateTranscript(data: TranscriptUpdate): Promise<Transcript | null> {
    const index = this.transcripts.findIndex(t => t.id === data.id);
    
    if (index === -1) {
      return null;
    }

    const currentTranscript = this.transcripts[index];
    const updatedTranscript: Transcript = {
      ...currentTranscript,
      ...data,
    };

    // Set published_at when status changes to published
    if (data.status === 'published' && currentTranscript.status !== 'published') {
      updatedTranscript.published_at = new Date().toISOString();
    }

    this.transcripts[index] = updatedTranscript;
    return updatedTranscript;
  }

  /**
   * Delete transcript
   */
  async deleteTranscript(id: number): Promise<boolean> {
    const index = this.transcripts.findIndex(t => t.id === id);
    
    if (index === -1) {
      return false;
    }

    this.transcripts.splice(index, 1);
    return true;
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: number): Promise<void> {
    const transcript = this.transcripts.find(t => t.id === id);
    if (transcript) {
      transcript.view_count = (transcript.view_count || 0) + 1;
    }
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
    const total = this.transcripts.length;
    const byStatus: Record<string, number> = {};
    const byYear: Record<number, number> = {};
    let totalViews = 0;

    this.transcripts.forEach(t => {
      // Count by status
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      
      // Count by year
      byYear[t.year] = (byYear[t.year] || 0) + 1;
      
      // Sum views
      totalViews += t.view_count || 0;
    });

    return {
      total,
      byStatus,
      byYear,
      totalViews,
      averageViews: total > 0 ? Math.round(totalViews / total) : 0
    };
  }

  /**
   * Search transcripts by content
   */
  async searchTranscripts(query: string, limit: number = 10): Promise<Transcript[]> {
    const searchTerm = query.toLowerCase();
    
    return this.transcripts
      .filter(t => 
        t.ticker.toLowerCase().includes(searchTerm) ||
        t.company_name.toLowerCase().includes(searchTerm) ||
        (t.ai_summary && t.ai_summary.toLowerCase().includes(searchTerm)) ||
        (t.raw_transcript && t.raw_transcript.toLowerCase().includes(searchTerm))
      )
      .slice(0, limit);
  }

  /**
   * Get recent transcripts
   */
  async getRecentTranscripts(limit: number = 5): Promise<Transcript[]> {
    return this.transcripts
      .filter(t => t.status === 'published')
      .sort((a, b) => 
        new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime()
      )
      .slice(0, limit);
  }

  /**
   * Get pending transcripts that need review
   */
  async getPendingTranscripts(): Promise<Transcript[]> {
    return this.transcripts.filter(t => t.status === 'pending' || t.status === 'review');
  }
}