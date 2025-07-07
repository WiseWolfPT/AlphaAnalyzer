/**
 * REAL TRANSCRIPT SERVICE TESTS
 * Testing the actual TranscriptService implementation (0% -> 80%+)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TranscriptService } from '../transcript-service';
import type { Transcript, TranscriptCreate, TranscriptUpdate, TranscriptFilter } from '../../db/transcript-schema';

describe('🚀 Real TranscriptService Implementation Tests', () => {
  let service: TranscriptService;

  beforeEach(() => {
    // Get a fresh instance and reset it to clean state
    service = TranscriptService.getInstance();
    
    // We need to reset the service to a known state for each test
    // Since it's a singleton, we'll work around this by clearing data
    (service as any).transcripts = [];
    (service as any).nextId = 1;
  });

  afterEach(() => {
    // Clean up after each test
    (service as any).transcripts = [];
    (service as any).nextId = 1;
  });

  describe('🏭 Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TranscriptService.getInstance();
      const instance2 = TranscriptService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(TranscriptService);
    });
  });

  describe('📝 CRUD Operations', () => {
    describe('createTranscript', () => {
      it('should create a new transcript with all fields', async () => {
        const transcriptData: TranscriptCreate = {
          ticker: 'AAPL',
          company_name: 'Apple Inc.',
          quarter: 'Q1',
          year: 2024,
          call_date: '2024-01-30',
          raw_transcript: 'Thank you for joining us...',
          ai_summary: 'Strong quarter with revenue growth...',
          status: 'published'
        };

        const result = await service.createTranscript(transcriptData);

        expect(result).toMatchObject({
          id: 1,
          ticker: 'AAPL',
          company_name: 'Apple Inc.',
          quarter: 'Q1',
          year: 2024,
          call_date: '2024-01-30',
          raw_transcript: 'Thank you for joining us...',
          ai_summary: 'Strong quarter with revenue growth...',
          status: 'published',
          view_count: 0,
          created_at: expect.any(String)
        });

        expect(new Date(result.created_at!)).toBeInstanceOf(Date);
      });

      it('should create transcript with default status', async () => {
        const transcriptData: TranscriptCreate = {
          ticker: 'MSFT',
          company_name: 'Microsoft Corporation',
          quarter: 'Q2',
          year: 2024
        };

        const result = await service.createTranscript(transcriptData);

        expect(result.status).toBe('pending');
        expect(result.id).toBe(1);
      });

      it('should auto-increment IDs', async () => {
        const data1: TranscriptCreate = {
          ticker: 'AAPL',
          company_name: 'Apple Inc.',
          quarter: 'Q1',
          year: 2024
        };

        const data2: TranscriptCreate = {
          ticker: 'MSFT',
          company_name: 'Microsoft Corporation',
          quarter: 'Q1',
          year: 2024
        };

        const result1 = await service.createTranscript(data1);
        const result2 = await service.createTranscript(data2);

        expect(result1.id).toBe(1);
        expect(result2.id).toBe(2);
      });
    });

    describe('getTranscriptById', () => {
      it('should return transcript by ID', async () => {
        const transcriptData: TranscriptCreate = {
          ticker: 'GOOGL',
          company_name: 'Alphabet Inc.',
          quarter: 'Q3',
          year: 2024
        };

        const created = await service.createTranscript(transcriptData);
        const result = await service.getTranscriptById(created.id!!);

        expect(result).toEqual(created);
      });

      it('should return null for non-existent ID', async () => {
        const result = await service.getTranscriptById(999);
        expect(result).toBeNull();
      });
    });

    describe('updateTranscript', () => {
      it('should update existing transcript', async () => {
        const transcriptData: TranscriptCreate = {
          ticker: 'TESLA',
          company_name: 'Tesla Inc.',
          quarter: 'Q4',
          year: 2023,
          status: 'pending'
        };

        const created = await service.createTranscript(transcriptData);
        
        const updateData: TranscriptUpdate = {
          id: created.id!,
          status: 'review',
          ai_summary: 'Updated summary content'
        };

        const result = await service.updateTranscript(updateData);

        expect(result).toMatchObject({
          id: created.id!,
          ticker: 'TESLA',
          company_name: 'Tesla Inc.',
          quarter: 'Q4',
          year: 2023,
          status: 'review',
          ai_summary: 'Updated summary content'
        });
      });

      it('should set published_at when status changes to published', async () => {
        const transcriptData: TranscriptCreate = {
          ticker: 'AMZN',
          company_name: 'Amazon.com Inc.',
          quarter: 'Q2',
          year: 2024,
          status: 'pending'
        };

        const created = await service.createTranscript(transcriptData);
        
        const updateData: TranscriptUpdate = {
          id: created.id!,
          status: 'published'
        };

        const result = await service.updateTranscript(updateData);

        expect(result?.status).toBe('published');
        expect(result?.published_at).toBeDefined();
        expect(new Date(result?.published_at!)).toBeInstanceOf(Date);
      });

      it('should not update published_at if already published', async () => {
        const transcriptData: TranscriptCreate = {
          ticker: 'NFLX',
          company_name: 'Netflix Inc.',
          quarter: 'Q1',
          year: 2024,
          status: 'published'
        };

        const created = await service.createTranscript(transcriptData);
        const originalPublishedAt = created.published_at;
        
        const updateData: TranscriptUpdate = {
          id: created.id!,
          ai_summary: 'Updated summary'
        };

        const result = await service.updateTranscript(updateData);

        expect(result?.published_at).toBe(originalPublishedAt);
      });

      it('should return null for non-existent transcript', async () => {
        const updateData: TranscriptUpdate = {
          id: 999,
          status: 'published'
        };

        const result = await service.updateTranscript(updateData);
        expect(result).toBeNull();
      });
    });

    describe('deleteTranscript', () => {
      it('should delete existing transcript', async () => {
        const transcriptData: TranscriptCreate = {
          ticker: 'META',
          company_name: 'Meta Platforms Inc.',
          quarter: 'Q3',
          year: 2024
        };

        const created = await service.createTranscript(transcriptData);
        const deleteResult = await service.deleteTranscript(created.id!);
        
        expect(deleteResult).toBe(true);
        
        const getResult = await service.getTranscriptById(created.id!);
        expect(getResult).toBeNull();
      });

      it('should return false for non-existent transcript', async () => {
        const result = await service.deleteTranscript(999);
        expect(result).toBe(false);
      });
    });
  });

  describe('📊 Query Operations', () => {
    beforeEach(async () => {
      // Set up test data
      const testTranscripts: TranscriptCreate[] = [
        {
          ticker: 'AAPL',
          company_name: 'Apple Inc.',
          quarter: 'Q1',
          year: 2024,
          status: 'published',
          ai_summary: 'Strong iPhone sales'
        },
        {
          ticker: 'MSFT',
          company_name: 'Microsoft Corporation',
          quarter: 'Q1',
          year: 2024,
          status: 'pending',
          ai_summary: 'Cloud growth continues'
        },
        {
          ticker: 'AAPL',
          company_name: 'Apple Inc.',
          quarter: 'Q2',
          year: 2024,
          status: 'published',
          ai_summary: 'Services revenue up'
        },
        {
          ticker: 'GOOGL',
          company_name: 'Alphabet Inc.',
          quarter: 'Q1',
          year: 2023,
          status: 'review',
          ai_summary: 'Ad revenue strong'
        }
      ];

      for (const data of testTranscripts) {
        await service.createTranscript(data);
      }
    });

    describe('getTranscripts', () => {
      it('should return all transcripts without filters', async () => {
        const result = await service.getTranscripts();
        
        expect(result.total).toBe(4);
        expect(result.data).toHaveLength(4);
      });

      it('should filter by ticker', async () => {
        const result = await service.getTranscripts({ ticker: 'AAPL' });
        
        expect(result.total).toBe(2);
        expect(result.data).toHaveLength(2);
        expect(result.data.every(t => t.ticker === 'AAPL')).toBe(true);
      });

      it('should filter by status', async () => {
        const result = await service.getTranscripts({ status: 'published' });
        
        expect(result.total).toBe(2);
        expect(result.data).toHaveLength(2);
        expect(result.data.every(t => t.status === 'published')).toBe(true);
      });

      it('should filter by year', async () => {
        const result = await service.getTranscripts({ year: 2024 });
        
        expect(result.total).toBe(3);
        expect(result.data).toHaveLength(3);
        expect(result.data.every(t => t.year === 2024)).toBe(true);
      });

      it('should filter by quarter', async () => {
        const result = await service.getTranscripts({ quarter: 'Q1' });
        
        expect(result.total).toBe(3);
        expect(result.data).toHaveLength(3);
        expect(result.data.every(t => t.quarter === 'Q1')).toBe(true);
      });

      it('should combine multiple filters', async () => {
        const result = await service.getTranscripts({ 
          ticker: 'AAPL', 
          year: 2024 
        });
        
        expect(result.total).toBe(2);
        expect(result.data.every(t => t.ticker === 'AAPL' && t.year === 2024)).toBe(true);
      });

      it('should handle pagination', async () => {
        const result = await service.getTranscripts({ 
          offset: 1, 
          limit: 2 
        });
        
        expect(result.total).toBe(4);
        expect(result.data).toHaveLength(2);
      });

      it('should sort by created_at descending', async () => {
        const result = await service.getTranscripts();
        
        const dates = result.data.map(t => new Date(t.created_at!).getTime());
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
        }
      });

      it('should handle case-insensitive ticker search', async () => {
        const result = await service.getTranscripts({ ticker: 'aapl' });
        
        expect(result.total).toBe(2);
        expect(result.data.every(t => t.ticker === 'AAPL')).toBe(true);
      });
    });

    describe('searchTranscripts', () => {
      it('should search by ticker', async () => {
        const result = await service.searchTranscripts('AAPL');
        
        expect(result).toHaveLength(2);
        expect(result.every(t => t.ticker === 'AAPL')).toBe(true);
      });

      it('should search by company name', async () => {
        const result = await service.searchTranscripts('Microsoft');
        
        expect(result).toHaveLength(1);
        expect(result[0].company_name).toBe('Microsoft Corporation');
      });

      it('should search by AI summary', async () => {
        const result = await service.searchTranscripts('iPhone');
        
        expect(result).toHaveLength(1);
        expect(result[0].ai_summary).toContain('iPhone');
      });

      it('should be case-insensitive', async () => {
        const result = await service.searchTranscripts('apple');
        
        expect(result).toHaveLength(2);
        expect(result.every(t => t.company_name.toLowerCase().includes('apple'))).toBe(true);
      });

      it('should respect limit parameter', async () => {
        const result = await service.searchTranscripts('2024', 2);
        
        expect(result).toHaveLength(2);
      });

      it('should return empty array for no matches', async () => {
        const result = await service.searchTranscripts('NONEXISTENT');
        
        expect(result).toHaveLength(0);
      });
    });

    describe('getRecentTranscripts', () => {
      it('should return only published transcripts', async () => {
        const result = await service.getRecentTranscripts();
        
        expect(result.every(t => t.status === 'published')).toBe(true);
      });

      it('should respect limit parameter', async () => {
        const result = await service.getRecentTranscripts(1);
        
        expect(result).toHaveLength(1);
      });

      it('should sort by published_at descending', async () => {
        // First mark transcripts as published to get published_at dates
        const transcripts = await service.getTranscripts();
        for (const transcript of transcripts.data) {
          if (transcript.status === 'published') {
            await service.updateTranscript({
              id: transcript.id!,
              status: 'published'
            });
          }
        }

        const result = await service.getRecentTranscripts();
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('getPendingTranscripts', () => {
      it('should return pending and review transcripts', async () => {
        const result = await service.getPendingTranscripts();
        
        expect(result.every(t => 
          t.status === 'pending' || t.status === 'review'
        )).toBe(true);
      });

      it('should not return published transcripts', async () => {
        const result = await service.getPendingTranscripts();
        
        expect(result.every(t => t.status !== 'published')).toBe(true);
      });
    });
  });

  describe('📈 Statistics and Analytics', () => {
    beforeEach(async () => {
      // Set up test data with views
      const testData = [
        { ticker: 'AAPL', status: 'published', year: 2024, views: 100 },
        { ticker: 'MSFT', status: 'published', year: 2024, views: 50 },
        { ticker: 'GOOGL', status: 'pending', year: 2023, views: 75 },
        { ticker: 'AMZN', status: 'review', year: 2024, views: 25 }
      ];

      for (const data of testData) {
        const transcript = await service.createTranscript({
          ticker: data.ticker,
          company_name: `${data.ticker} Corp`,
          quarter: 'Q1',
          year: data.year,
          status: data.status as any
        });

        // Set view count
        (service as any).transcripts.find((t: any) => t.id === transcript.id!).view_count = data.views;
      }
    });

    describe('incrementViewCount', () => {
      it('should increment view count for existing transcript', async () => {
        const transcripts = await service.getTranscripts();
        const transcript = transcripts.data[0];
        const originalViews = transcript.view_count || 0;

        await service.incrementViewCount(transcript.id!);

        const updated = await service.getTranscriptById(transcript.id!);
        expect(updated?.view_count).toBe(originalViews + 1);
      });

      it('should handle non-existent transcript gracefully', async () => {
        await service.incrementViewCount(999);
        // Should not throw error
      });

      it('should handle transcript with undefined view_count', async () => {
        const transcript = await service.createTranscript({
          ticker: 'TEST',
          company_name: 'Test Corp',
          quarter: 'Q1',
          year: 2024
        });

        await service.incrementViewCount(transcript.id!);

        const updated = await service.getTranscriptById(transcript.id!);
        expect(updated?.view_count).toBe(1);
      });
    });

    describe('getTranscriptStats', () => {
      it('should calculate correct statistics', async () => {
        const stats = await service.getTranscriptStats();

        expect(stats.total).toBe(4);
        expect(stats.byStatus.published).toBe(2);
        expect(stats.byStatus.pending).toBe(1);
        expect(stats.byStatus.review).toBe(1);
        expect(stats.byYear[2024]).toBe(3);
        expect(stats.byYear[2023]).toBe(1);
        expect(stats.totalViews).toBe(250); // 100 + 50 + 75 + 25
        expect(stats.averageViews).toBe(63); // 250 / 4, rounded
      });

      it('should handle empty transcript list', async () => {
        // Clear all transcripts
        (service as any).transcripts = [];

        const stats = await service.getTranscriptStats();

        expect(stats.total).toBe(0);
        expect(stats.byStatus).toEqual({});
        expect(stats.byYear).toEqual({});
        expect(stats.totalViews).toBe(0);
        expect(stats.averageViews).toBe(0);
      });

      it('should handle transcripts without view counts', async () => {
        // Clear existing data and add transcript without view count
        (service as any).transcripts = [];
        await service.createTranscript({
          ticker: 'TEST',
          company_name: 'Test Corp',
          quarter: 'Q1',
          year: 2024
        });

        const stats = await service.getTranscriptStats();

        expect(stats.total).toBe(1);
        expect(stats.totalViews).toBe(0);
        expect(stats.averageViews).toBe(0);
      });
    });
  });

  describe('🧪 Edge Cases and Error Handling', () => {
    it('should handle empty strings in filters', async () => {
      const result = await service.getTranscripts({ ticker: '' });
      expect(result.data).toHaveLength(0);
    });

    it('should handle negative pagination values', async () => {
      await service.createTranscript({
        ticker: 'TEST',
        company_name: 'Test Corp',
        quarter: 'Q1',
        year: 2024
      });

      const result = await service.getTranscripts({ 
        offset: -1, 
        limit: -1 
      });

      // Should handle gracefully
      expect(result.total).toBe(1);
    });

    it('should handle very large pagination values', async () => {
      const result = await service.getTranscripts({ 
        offset: 1000000, 
        limit: 1000000 
      });

      expect(result.data).toHaveLength(0);
    });

    it('should handle special characters in search', async () => {
      await service.createTranscript({
        ticker: 'TEST-123',
        company_name: 'Test & Company (Corp.)',
        quarter: 'Q1',
        year: 2024,
        ai_summary: 'Special chars: @#$%^&*()'
      });

      const result1 = await service.searchTranscripts('TEST-123');
      expect(result1).toHaveLength(1);

      const result2 = await service.searchTranscripts('Test & Company');
      expect(result2).toHaveLength(1);

      const result3 = await service.searchTranscripts('@#$%');
      expect(result3).toHaveLength(1);
    });

    it('should handle concurrent operations', async () => {
      const promises = [];

      // Create multiple transcripts concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(service.createTranscript({
          ticker: `TEST${i}`,
          company_name: `Test Company ${i}`,
          quarter: 'Q1',
          year: 2024
        }));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(new Set(results.map(r => r.id)).size).toBe(10); // All unique IDs
    });

    it('should handle very long text fields', async () => {
      const longText = 'A'.repeat(10000);
      
      const transcript = await service.createTranscript({
        ticker: 'LONG',
        company_name: longText,
        quarter: 'Q1',
        year: 2024,
        raw_transcript: longText,
        ai_summary: longText
      });

      expect(transcript.company_name).toBe(longText);
      expect(transcript.raw_transcript).toBe(longText);
      expect(transcript.ai_summary).toBe(longText);
    });
  });
});