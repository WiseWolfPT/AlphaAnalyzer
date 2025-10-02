import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment
const envPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(process.cwd(), envPath) });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTranscriptStatus() {
  console.log('🔍 Checking transcript status...');

  try {
    // Check the specific transcript we've been testing
    const { data: transcript, error } = await supabase
      .from('transcripts')
      .select('id, ticker, quarter, year, status, ai_summary')
      .eq('id', 1923)
      .single();

    if (error) {
      console.error('❌ Error querying transcript:', error);
      return;
    }

    console.log('📊 Transcript data:');
    console.log(`- ID: ${transcript.id}`);
    console.log(`- Ticker: ${transcript.ticker}`);
    console.log(`- Quarter: ${transcript.quarter} ${transcript.year}`);
    console.log(`- Status: ${transcript.status}`);
    console.log(`- Has AI Summary: ${transcript.ai_summary ? 'YES' : 'NO'}`);

    if (transcript.ai_summary) {
      const summary = JSON.parse(transcript.ai_summary);
      console.log(`- Summary length: ${JSON.stringify(summary).length} chars`);
    }

    // Also check a few other transcripts to see the pattern
    console.log('\n📊 Checking other transcripts...');
    const { data: others, error: othersError } = await supabase
      .from('transcripts')
      .select('id, ticker, quarter, year, status, ai_summary')
      .limit(10);

    if (othersError) {
      console.error('❌ Error querying other transcripts:', othersError);
      return;
    }

    others?.forEach(t => {
      console.log(`- ${t.ticker} ${t.quarter} ${t.year}: status=${t.status}, ai_summary=${t.ai_summary ? 'YES' : 'NO'}`);
    });

  } catch (error) {
    console.error('❌ Function failed:', error);
  }
}

checkTranscriptStatus().catch(console.error);