# 🚀 Alfalyzer Deployment Guide

This guide covers deployment options for the Alfalyzer platform, from development to production.

## 📋 Prerequisites

- Node.js 18+ installed
- Git repository access
- Environment variables configured (see `.env.example`)
- SSL certificate (for production)

## 🔧 Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/alfalyzer.git
cd alfalyzer
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your API keys
```

**Required Variables:**
```bash
# Backend API Keys (keep secure)
FINNHUB_API_KEY=your_finnhub_key
TWELVE_DATA_API_KEY=your_twelve_data_key
FMP_API_KEY=your_fmp_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# Frontend (can be exposed)
VITE_APP_NAME=Alfalyzer
VITE_API_URL=http://localhost:3001
```

## 🏗️ Deployment Options

### Option 1: Local Development
```bash
npm run dev
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### Option 2: Docker Deployment
```bash
docker-compose up -d
# Access: http://localhost:3000
```

### Option 3: Cloud Deployment (Recommended)

#### Frontend - Vercel
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with:
```bash
vercel --prod
```

#### Backend - Railway.app
1. Connect GitHub repository to Railway
2. Add environment variables
3. Deploy with automatic builds

#### Database - Supabase
1. Create Supabase project
2. Run migrations:
```bash
npm run migrate:production
```

## 🔒 Security Checklist

- [ ] SSL certificates configured
- [ ] Environment variables secured
- [ ] API keys rotated regularly
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Database backups scheduled

## 📊 Monitoring

### Health Check
```bash
curl https://your-domain.com/api/health
```

### API Metrics
Visit: `https://your-domain.com/admin/metrics`

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :3001
# Kill process
kill -9 <PID>
```

### API Connection Issues
1. Check backend logs: `npm run logs`
2. Verify API keys are valid
3. Check network connectivity

### Database Connection Failed
1. Verify database URL
2. Check firewall rules
3. Ensure migrations are run

## 🎯 Production Checklist

- [ ] All tests passing: `npm test`
- [ ] E2E tests passing: `npm run test:e2e`
- [ ] Build successful: `npm run build`
- [ ] Environment variables set
- [ ] SSL configured
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Error tracking setup

## 📱 Post-Deployment

1. **Verify Deployment**
   - Check health endpoint
   - Test key user flows
   - Monitor error logs

2. **Configure Monitoring**
   - Set up uptime monitoring
   - Configure alerts
   - Enable performance tracking

3. **Scale as Needed**
   - Monitor API usage
   - Upgrade hosting tiers
   - Add caching layers

## 🆘 Support

For deployment issues:
- Check logs: `npm run logs`
- Review documentation: `/docs`
- Contact team: support@alfalyzer.com

---

**Last Updated**: December 2024
**Version**: 1.0.0