import { config } from 'dotenv';
import { resolve } from 'path';
import { TranscriptService } from '../server/services/transcript-service';
import { openaiService } from '../server/services/ai/openai-service';

// Load environment
const envPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(process.cwd(), envPath) });

const transcriptService = TranscriptService.getInstance();

async function processAllAISummaries() {
  console.log('🤖 Processing ALL AI summaries for pending transcripts...');

  let totalProcessed = 0;
  let batch = 1;

  while (true) {
    const pending = await transcriptService.getPendingForSummary(20);

    if (pending.length === 0) {
      console.log('✅ No more pending transcripts found');
      break;
    }

    console.log(`\n📦 Batch ${batch}: Found ${pending.length} transcripts pending AI summary`);

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
        totalProcessed++;

        // Rate limiting
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`❌ AI summary failed for ${transcript.ticker}:`, error);
      }
    }

    batch++;
  }

  console.log(`\n🎉 AI summary processing complete! Total processed: ${totalProcessed}`);
}

processAllAISummaries().catch(console.error);