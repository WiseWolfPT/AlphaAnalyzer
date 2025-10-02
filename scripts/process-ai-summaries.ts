import { config } from 'dotenv';
import { resolve } from 'path';
import { TranscriptService } from '../server/services/transcript-service';
import { openaiService } from '../server/services/ai/openai-service';

// Load environment
const envPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(process.cwd(), envPath) });

const transcriptService = TranscriptService.getInstance();

async function processAISummaries() {
  console.log('🤖 Processing AI summaries for pending transcripts...');

  const pending = await transcriptService.getPendingForSummary(10);
  console.log(`Found ${pending.length} transcripts pending AI summary`);

  for (const transcript of pending) {
    try {
      console.log(`Processing ${transcript.ticker} ${transcript.quarter} ${transcript.year}...`);

      const summary = await openaiService.generateTranscriptSummary({
        transcript: transcript.raw_transcript,
        ticker: transcript.ticker,
        quarter: transcript.quarter,
        year: transcript.year
      });

      await transcriptService.updateSummaryMeta(
        transcript.id,
        JSON.stringify(summary),
        'published',
        { ai_processed_at: new Date().toISOString() }
      );

      console.log(`✅ Completed AI summary for ${transcript.ticker}`);

      // Rate limiting
      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error(`❌ AI summary failed for ${transcript.ticker}:`, error);
    }
  }

  console.log('✅ AI summary processing complete!');
}

processAISummaries().catch(console.error);