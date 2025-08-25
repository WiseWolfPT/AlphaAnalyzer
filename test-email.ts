import dotenv from 'dotenv';
dotenv.config();

import { emailService } from './server/services/email-service';

async function testEmailService() {
  console.log('🧪 Testing Resend Email Service...\n');
  
  // Check if API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not found in .env file');
    process.exit(1);
  }
  
  console.log('✅ API Key found:', process.env.RESEND_API_KEY.substring(0, 10) + '...');
  console.log('📧 From email:', process.env.RESEND_FROM_EMAIL || 'notifications@alfalyzer.com');
  
  // Test email address - you can change this to your email
  const testEmail = 'test@example.com'; // Change this to your email!
  
  console.log(`\n📨 Sending test email to: ${testEmail}\n`);
  
  try {
    // Test 1: Send test email
    console.log('1️⃣ Sending basic test email...');
    const testResult = await emailService.sendTestEmail(testEmail);
    console.log(testResult ? '   ✅ Test email sent!' : '   ❌ Failed to send test email');
    
    // Test 2: Send welcome email
    console.log('\n2️⃣ Sending welcome email...');
    const welcomeResult = await emailService.sendWelcomeEmail(testEmail, 'Test User');
    console.log(welcomeResult ? '   ✅ Welcome email sent!' : '   ❌ Failed to send welcome email');
    
    // Test 3: Send price alert
    console.log('\n3️⃣ Sending price alert email...');
    const alertResult = await emailService.sendPriceAlert({
      id: 'test-123',
      symbol: 'AAPL',
      targetPrice: 150.00,
      currentPrice: 151.25,
      alertType: 'above',
      userEmail: testEmail,
      userName: 'Test User'
    });
    console.log(alertResult ? '   ✅ Price alert email sent!' : '   ❌ Failed to send price alert');
    
    // Test 4: Send portfolio summary
    console.log('\n4️⃣ Sending portfolio summary email...');
    const summaryResult = await emailService.sendWeeklySummary(
      testEmail,
      'Test User',
      {
        portfolioName: 'My Test Portfolio',
        totalValue: 50000,
        dailyChange: 250,
        dailyChangePercent: 0.5,
        weeklyChange: 1500,
        weeklyChangePercent: 3.1,
        topGainers: [
          { symbol: 'NVDA', change: 8.5 },
          { symbol: 'TSLA', change: 5.2 },
          { symbol: 'META', change: 3.8 }
        ],
        topLosers: [
          { symbol: 'INTC', change: -2.3 },
          { symbol: 'DIS', change: -1.8 }
        ]
      }
    );
    console.log(summaryResult ? '   ✅ Portfolio summary email sent!' : '   ❌ Failed to send summary');
    
    // Test 5: Send earnings reminder
    console.log('\n5️⃣ Sending earnings reminder email...');
    const earningsResult = await emailService.sendEarningsReminder(
      testEmail,
      'Test User',
      [
        { symbol: 'AAPL', earningsDate: 'Feb 1, 2025', time: 'After Close' },
        { symbol: 'MSFT', earningsDate: 'Feb 2, 2025', time: 'Before Open' },
        { symbol: 'GOOGL', earningsDate: 'Feb 3, 2025', time: 'After Close' }
      ]
    );
    console.log(earningsResult ? '   ✅ Earnings reminder email sent!' : '   ❌ Failed to send reminder');
    
    console.log('\n✨ Email service test completed!');
    console.log(`📬 Check ${testEmail} inbox for the test emails.`);
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error);
  }
  
  process.exit(0);
}

// Instructions for the user
console.log('================================================');
console.log('       ALFALYZER EMAIL SERVICE TEST');
console.log('================================================\n');
console.log('⚠️  IMPORTANT: Change the testEmail variable in');
console.log('   this file to your actual email address!\n');
console.log('   Current test email: test@example.com\n');
console.log('================================================\n');

// Wait 2 seconds then run the test
setTimeout(() => {
  testEmailService();
}, 2000);