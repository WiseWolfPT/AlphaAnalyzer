import { config } from 'dotenv';
import { resolve } from 'path';
import { earningsScheduleManager } from '../server/services/earnings-schedule-manager';

// Load environment
const envPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(process.cwd(), envPath) });

async function updateEarningsCalendar() {
  console.log('📅 Updating earnings calendar...');

  try {
    await earningsScheduleManager.updateEarningsCalendar();
    console.log('✅ Earnings calendar updated successfully!');
  } catch (error) {
    console.error('❌ Failed to update earnings calendar:', error);
    process.exit(1);
  }
}

updateEarningsCalendar();