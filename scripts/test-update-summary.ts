import { config } from 'dotenv';
import { resolve } from 'path';
import { TranscriptService } from '../server/services/transcript-service';

// Load environment
const envPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(process.cwd(), envPath) });

const transcriptService = TranscriptService.getInstance();

async function testUpdateFunction() {
  console.log('🔧 Testing updateSummaryMeta function...');

  try {
    // Get a pending transcript
    const pending = await transcriptService.getPendingForSummary(1);

    if (pending.length === 0) {
      console.log('❌ No pending transcripts found for testing');
      return;
    }

    const transcript = pending[0];
    console.log(`Testing with: ${transcript.ticker} ${transcript.quarter} ${transcript.year} (ID: ${transcript.id})`);

    // Test the update function
    console.log('📝 Calling updateSummaryMeta...');
    await transcriptService.updateSummaryMeta(
      transcript.id,
      '{"test": "summary"}',
      'published',
      { test_processed_at: new Date().toISOString() }
    );

    console.log('✅ Function call completed without error');

    // Verify in database
    console.log('🔍 Verifying in database...');
    // This will require a direct DB query

  } catch (error) {
    console.error('❌ Function failed:', error);
  }
}

testUpdateFunction().catch(console.error);