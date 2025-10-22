#!/usr/bin/env npx tsx
/**
 * Check transcripts table RLS status
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://avjnfessefxtfurayybp.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q';

async function checkTranscripts() {
  console.log('📄 Checking TRANSCRIPTS table RLS status...\n');

  const anon = createClient(SUPABASE_URL, ANON_KEY);

  // Check if anon can read
  const { data, error } = await anon
    .from('transcripts')
    .select('*', { count: 'exact' })
    .limit(1);

  if (error) {
    console.log('❌ Transcripts: BLOCKED for anonymous (no read access)');
    console.log('   Error:', error.message);
  } else {
    console.log('✅ Transcripts: PUBLIC READ allowed');
    console.log(`   Found ${data?.length || 0} accessible records`);
  }

  // Check if anon can write (should be blocked)
  const testInsert = await anon
    .from('transcripts')
    .insert({
      ticker: 'TEST',
      company_name: 'Test Company',
      content: 'Test content'
    });

  if (testInsert.error) {
    console.log('✅ Transcripts: WRITE blocked for anonymous (good!)');
  } else {
    console.log('🚨 WARNING: Anonymous can WRITE to transcripts!');
  }

  console.log('\n📋 Recommendation:');
  console.log('Transcripts should typically be:');
  console.log('- PUBLIC READ (for all users to access earnings data)');
  console.log('- WRITE restricted to service_role only (backend workers)');
}

checkTranscripts().catch(console.error);