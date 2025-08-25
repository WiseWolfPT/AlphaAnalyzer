import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testResendDirect() {
  console.log('🧪 Direct Resend API Test\n');
  
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY not found in .env');
    process.exit(1);
  }
  
  console.log('✅ API Key:', apiKey.substring(0, 15) + '...');
  
  // Initialize Resend
  const resend = new Resend(apiKey);
  
  // IMPORTANT: Using the email registered in Resend
  const YOUR_EMAIL = 'alfalyzer@gmail.com'; // Email registrado no Resend
  
  console.log(`📧 Sending test email to: ${YOUR_EMAIL}\n`);
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Alfalyzer <onboarding@resend.dev>', // Using Resend's test domain
      to: [YOUR_EMAIL],
      subject: '🎉 Alfalyzer Email Service Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #667eea;">Alfalyzer Email Test Successful! 🚀</h1>
          <p>Great news! Your Resend integration is working perfectly.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Email Service Status:</h3>
            <ul>
              <li>✅ API Key configured</li>
              <li>✅ Email sending working</li>
              <li>✅ HTML templates supported</li>
              <li>✅ Ready for production</li>
            </ul>
          </div>
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Configure your custom domain in Resend dashboard</li>
            <li>Update RESEND_FROM_EMAIL in .env</li>
            <li>Test the workers (price alerts, portfolio summaries)</li>
          </ol>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e5e5;">
          <p style="color: #666; font-size: 14px;">
            This test email was sent at ${new Date().toLocaleString()}
          </p>
        </div>
      `,
      text: `
Alfalyzer Email Test Successful!

Great news! Your Resend integration is working perfectly.

Email Service Status:
- API Key configured
- Email sending working  
- HTML templates supported
- Ready for production

Next Steps:
1. Configure your custom domain in Resend dashboard
2. Update RESEND_FROM_EMAIL in .env
3. Test the workers (price alerts, portfolio summaries)

This test email was sent at ${new Date().toLocaleString()}
      `
    });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Email sent successfully!');
    console.log('📨 Email ID:', data?.id);
    console.log('\n🎉 Check your inbox at:', YOUR_EMAIL);
    
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

// Run the test
console.log('================================================');
console.log('     RESEND DIRECT API TEST');
console.log('================================================\n');

testResendDirect();