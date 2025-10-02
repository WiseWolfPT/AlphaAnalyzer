#!/bin/bash

echo "🚀 Initializing Transcripts System..."

# 1. Run database migrations
echo "📊 Running migrations..."
npm run migrate

# 2. Populate initial transcripts
echo "📥 Fetching latest transcripts..."
npm run populate-transcripts

# 3. Process AI summaries
echo "🤖 Generating AI summaries..."
npm run process-summaries

# 4. Update earnings calendar
echo "📅 Updating earnings calendar..."
npm run update-calendar

# 5. Start cron jobs
echo "⏰ Starting automation..."
npm run start-cron

echo "✅ System initialized successfully!"