import { config } from 'dotenv';
import { resolve } from 'path';
import { TranscriptService } from '../server/services/transcript-service';

// Load environment
const envPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(process.cwd(), envPath) });

const transcriptService = TranscriptService.getInstance();

async function fixPendingWithAI() {
  console.log('🔧 Fixing transcripts with AI summaries but pending status...');

  try {
    // Use the bulk update method from the repository
    const { transcriptsPgRepo } = await import('../server/repositories/transcripts-pg');

    // Update all transcripts that have AI summaries but are still pending
    const result = await transcriptsPgRepo.bulkUpdateStatus('pending', 'published');

    console.log(`✅ Updated ${result} transcripts from pending to published`);

  } catch (error) {
    console.error('❌ Function failed:', error);
  }
}

fixPendingWithAI().catch(console.error);