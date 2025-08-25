import { Resend } from 'resend';
import { logger } from '../lib/logger';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  currentPrice: number;
  alertType: 'above' | 'below';
  userEmail: string;
  userName?: string;
}

interface PortfolioSummary {
  portfolioName: string;
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  weeklyChange: number;
  weeklyChangePercent: number;
  topGainers: Array<{ symbol: string; change: number }>;
  topLosers: Array<{ symbol: string; change: number }>;
}

class EmailService {
  private resend: Resend | null = null;
  private isConfigured = false;
  private fromEmail = 'notifications@alfalyzer.com';
  private appName = 'Alfalyzer';

  constructor() {
    this.initialize();
  }

  private initialize() {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      logger.warn('RESEND_API_KEY not configured - email notifications disabled');
      return;
    }

    try {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      
      // Configure from email if provided
      if (process.env.RESEND_FROM_EMAIL) {
        this.fromEmail = process.env.RESEND_FROM_EMAIL;
      }
      
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  private async send(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.resend) {
      logger.warn('Email service not configured - skipping email send');
      return false;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: options.from || this.fromEmail,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      });

      if (error) {
        logger.error('Failed to send email:', error);
        return false;
      }

      logger.info('Email sent successfully:', { id: data?.id, to: options.to });
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
      return false;
    }
  }

  // Welcome Email
  async sendWelcomeEmail(email: string, name?: string): Promise<boolean> {
    const subject = `Welcome to ${this.appName}! 🚀`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .features { margin: 20px 0; }
            .feature { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
            .feature:last-child { border-bottom: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${this.appName}!</h1>
              <p>Your journey to smarter investing starts here</p>
            </div>
            <div class="content">
              <h2>Hi ${name || 'there'} 👋</h2>
              <p>Thank you for joining ${this.appName}! We're excited to have you on board.</p>
              
              <div class="features">
                <h3>Here's what you can do:</h3>
                <div class="feature">📊 Track real-time stock prices and market data</div>
                <div class="feature">📈 Analyze financial statements and charts</div>
                <div class="feature">💼 Manage your portfolios and watchlists</div>
                <div class="feature">🔔 Set price alerts and get notified</div>
                <div class="feature">💡 Calculate intrinsic values with DCF models</div>
              </div>
              
              <center>
                <a href="https://128.140.45.28.sslip.io/find-stocks" class="button">Start Exploring</a>
              </center>
              
              <h3>Getting Started:</h3>
              <ol>
                <li>Search for your favorite stocks</li>
                <li>Create your first watchlist</li>
                <li>Set up price alerts for opportunities</li>
                <li>Explore our advanced charting tools</li>
              </ol>
              
              <p>If you have any questions, feel free to reach out to our support team.</p>
              
              <p>Happy investing! 📈</p>
              <p><strong>The ${this.appName} Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 ${this.appName}. All rights reserved.</p>
              <p>You're receiving this email because you signed up for ${this.appName}.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to ${this.appName}!

Hi ${name || 'there'},

Thank you for joining ${this.appName}! We're excited to have you on board.

Here's what you can do:
- Track real-time stock prices and market data
- Analyze financial statements and charts
- Manage your portfolios and watchlists
- Set price alerts and get notified
- Calculate intrinsic values with DCF models

Getting Started:
1. Search for your favorite stocks
2. Create your first watchlist
3. Set up price alerts for opportunities
4. Explore our advanced charting tools

Visit: https://128.140.45.28.sslip.io/find-stocks

Happy investing!
The ${this.appName} Team
    `;

    return this.send({ to: email, subject, html, text });
  }

  // Price Alert Email
  async sendPriceAlert(alert: PriceAlert): Promise<boolean> {
    const { symbol, targetPrice, currentPrice, alertType, userEmail, userName } = alert;
    const triggered = alertType === 'above' ? currentPrice >= targetPrice : currentPrice <= targetPrice;
    
    if (!triggered) return false;

    const action = alertType === 'above' ? 'rose above' : 'fell below';
    const emoji = alertType === 'above' ? '📈' : '📉';
    
    const subject = `${emoji} Price Alert: ${symbol} ${action} ${targetPrice.toFixed(2)}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert-box { background: ${alertType === 'above' ? '#e6f7e6' : '#ffe6e6'}; border-left: 4px solid ${alertType === 'above' ? '#52c41a' : '#ff4d4f'}; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .price-info { display: flex; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid #e0e0e0; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${emoji} Price Alert Triggered!</h1>
            
            <div class="alert-box">
              <h2 style="margin: 0;">${symbol} ${action} your target price</h2>
            </div>
            
            <p>Hi ${userName || 'there'},</p>
            <p>Your price alert for <strong>${symbol}</strong> has been triggered.</p>
            
            <div class="price-info">
              <div>
                <strong>Current Price:</strong><br>
                $${currentPrice.toFixed(2)}
              </div>
              <div>
                <strong>Your Target:</strong><br>
                $${targetPrice.toFixed(2)}
              </div>
              <div>
                <strong>Alert Type:</strong><br>
                ${alertType === 'above' ? 'Above' : 'Below'} target
              </div>
            </div>
            
            <center>
              <a href="https://128.140.45.28.sslip.io/stocks/${symbol}" class="button">View ${symbol} Details</a>
            </center>
            
            <p><strong>What's next?</strong></p>
            <ul>
              <li>Review the latest financials and news for ${symbol}</li>
              <li>Check the technical indicators and charts</li>
              <li>Update your watchlist or portfolio</li>
              <li>Set new price alerts if needed</li>
            </ul>
            
            <p>Remember to do your own research before making any investment decisions.</p>
            
            <div class="footer">
              <p>© 2025 ${this.appName}. All rights reserved.</p>
              <p>You received this alert because you set up a price notification for ${symbol}.</p>
              <p><a href="https://128.140.45.28.sslip.io/settings/alerts">Manage your alerts</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Price Alert Triggered!

${symbol} ${action} your target price

Current Price: $${currentPrice.toFixed(2)}
Your Target: $${targetPrice.toFixed(2)}
Alert Type: ${alertType === 'above' ? 'Above' : 'Below'} target

View ${symbol} details: https://128.140.45.28.sslip.io/stocks/${symbol}

What's next?
- Review the latest financials and news for ${symbol}
- Check the technical indicators and charts
- Update your watchlist or portfolio
- Set new price alerts if needed

Remember to do your own research before making any investment decisions.

© 2025 ${this.appName}
    `;

    return this.send({ to: userEmail, subject, html, text });
  }

  // Weekly Portfolio Summary Email
  async sendWeeklySummary(email: string, userName: string | undefined, summary: PortfolioSummary): Promise<boolean> {
    const { 
      portfolioName, 
      totalValue, 
      weeklyChange, 
      weeklyChangePercent,
      topGainers,
      topLosers 
    } = summary;
    
    const changeEmoji = weeklyChange >= 0 ? '📈' : '📉';
    const changeColor = weeklyChange >= 0 ? '#52c41a' : '#ff4d4f';
    
    const subject = `${changeEmoji} Your Weekly Portfolio Summary - ${portfolioName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
            .metric:last-child { border-bottom: none; }
            .change { color: ${changeColor}; font-weight: bold; font-size: 18px; }
            .stock-list { margin: 15px 0; }
            .stock-item { display: flex; justify-content: space-between; padding: 8px 0; }
            .gainer { color: #52c41a; }
            .loser { color: #ff4d4f; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Weekly Portfolio Summary</h1>
              <p>${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            
            <div class="content">
              <p>Hi ${userName || 'there'},</p>
              <p>Here's how your portfolio <strong>${portfolioName}</strong> performed this week:</p>
              
              <div class="summary-card">
                <div class="metric">
                  <span>Total Portfolio Value:</span>
                  <span><strong>$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                </div>
                <div class="metric">
                  <span>Weekly Change:</span>
                  <span class="change">${weeklyChange >= 0 ? '+' : ''}$${weeklyChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${weeklyChangePercent >= 0 ? '+' : ''}${weeklyChangePercent.toFixed(2)}%)</span>
                </div>
              </div>
              
              ${topGainers.length > 0 ? `
                <h3>🚀 Top Gainers</h3>
                <div class="stock-list">
                  ${topGainers.slice(0, 3).map(stock => `
                    <div class="stock-item">
                      <span>${stock.symbol}</span>
                      <span class="gainer">+${stock.change.toFixed(2)}%</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              ${topLosers.length > 0 ? `
                <h3>📉 Top Losers</h3>
                <div class="stock-list">
                  ${topLosers.slice(0, 3).map(stock => `
                    <div class="stock-item">
                      <span>${stock.symbol}</span>
                      <span class="loser">${stock.change.toFixed(2)}%</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              <center>
                <a href="https://128.140.45.28.sslip.io/portfolio" class="button">View Full Portfolio</a>
              </center>
              
              <p><strong>Market Insights:</strong></p>
              <ul>
                <li>Review your portfolio allocation and rebalance if needed</li>
                <li>Check for any earnings announcements from your holdings</li>
                <li>Consider setting stop-loss orders for risk management</li>
              </ul>
              
              <p>Keep investing wisely!</p>
              <p><strong>The ${this.appName} Team</strong></p>
            </div>
            
            <div class="footer">
              <p>© 2025 ${this.appName}. All rights reserved.</p>
              <p>You're receiving this weekly summary for your portfolio "${portfolioName}".</p>
              <p><a href="https://128.140.45.28.sslip.io/settings/notifications">Manage email preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Weekly Portfolio Summary - ${portfolioName}

Hi ${userName || 'there'},

Here's how your portfolio performed this week:

Total Portfolio Value: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Weekly Change: ${weeklyChange >= 0 ? '+' : ''}$${weeklyChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${weeklyChangePercent >= 0 ? '+' : ''}${weeklyChangePercent.toFixed(2)}%)

${topGainers.length > 0 ? `Top Gainers:
${topGainers.slice(0, 3).map(s => `${s.symbol}: +${s.change.toFixed(2)}%`).join('\n')}` : ''}

${topLosers.length > 0 ? `Top Losers:
${topLosers.slice(0, 3).map(s => `${s.symbol}: ${s.change.toFixed(2)}%`).join('\n')}` : ''}

View Full Portfolio: https://128.140.45.28.sslip.io/portfolio

Keep investing wisely!
The ${this.appName} Team
    `;

    return this.send({ to: email, subject, html, text });
  }

  // Earnings Reminder Email
  async sendEarningsReminder(email: string, userName: string | undefined, stocks: Array<{ symbol: string; earningsDate: string; time: string }>): Promise<boolean> {
    if (stocks.length === 0) return false;
    
    const subject = `📅 Earnings Reminder: ${stocks.map(s => s.symbol).join(', ')}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .earnings-list { margin: 20px 0; }
            .earnings-item { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Upcoming Earnings</h1>
              <p>Don't miss these important announcements</p>
            </div>
            
            <div class="content">
              <p>Hi ${userName || 'there'},</p>
              <p>The following companies in your watchlist have earnings announcements coming up:</p>
              
              <div class="earnings-list">
                ${stocks.map(stock => `
                  <div class="earnings-item">
                    <h3 style="margin: 0 0 10px 0;">${stock.symbol}</h3>
                    <p style="margin: 5px 0;">📅 Date: ${stock.earningsDate}</p>
                    <p style="margin: 5px 0;">⏰ Time: ${stock.time}</p>
                    <a href="https://128.140.45.28.sslip.io/stocks/${stock.symbol}" style="color: #667eea;">View ${stock.symbol} Details →</a>
                  </div>
                `).join('')}
              </div>
              
              <h3>📊 What to Watch For:</h3>
              <ul>
                <li>Revenue vs. estimates</li>
                <li>EPS (Earnings Per Share) vs. consensus</li>
                <li>Forward guidance updates</li>
                <li>Management commentary on the earnings call</li>
              </ul>
              
              <center>
                <a href="https://128.140.45.28.sslip.io/earnings-calendar" class="button">View Full Earnings Calendar</a>
              </center>
              
              <p>Pro tip: Earnings announcements can cause significant price movements. Consider reviewing your positions before the announcements.</p>
              
              <p>Good luck!</p>
              <p><strong>The ${this.appName} Team</strong></p>
            </div>
            
            <div class="footer">
              <p>© 2025 ${this.appName}. All rights reserved.</p>
              <p>You're receiving this because these stocks are in your watchlist.</p>
              <p><a href="https://128.140.45.28.sslip.io/settings/notifications">Manage email preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Upcoming Earnings Reminder

Hi ${userName || 'there'},

The following companies in your watchlist have earnings announcements coming up:

${stocks.map(stock => `
${stock.symbol}
Date: ${stock.earningsDate}
Time: ${stock.time}
View details: https://128.140.45.28.sslip.io/stocks/${stock.symbol}
`).join('\n')}

What to Watch For:
- Revenue vs. estimates
- EPS vs. consensus
- Forward guidance updates
- Management commentary

View Full Calendar: https://128.140.45.28.sslip.io/earnings-calendar

Good luck!
The ${this.appName} Team
    `;

    return this.send({ to: email, subject, html, text });
  }

  // Test email functionality
  async sendTestEmail(email: string): Promise<boolean> {
    const subject = '🧪 Test Email from Alfalyzer';
    const html = `
      <h2>Test Email</h2>
      <p>This is a test email to verify that the email service is working correctly.</p>
      <p>If you received this email, the configuration is correct!</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
    `;
    const text = `Test Email\n\nThis is a test email from Alfalyzer.\nTimestamp: ${new Date().toISOString()}`;
    
    return this.send({ to: email, subject, html, text });
  }
}

// Export singleton instance
export const emailService = new EmailService();