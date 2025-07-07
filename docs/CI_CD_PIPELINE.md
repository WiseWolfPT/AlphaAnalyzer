# CI/CD Pipeline Documentation

## Overview

The Alfalyzer project uses GitHub Actions for continuous integration and deployment, with comprehensive testing, quality checks, and automated deployments to staging and production environments.

## Pipeline Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│   Code Push     │────▶│  CI Pipeline │────▶│ CD Pipeline  │
└─────────────────┘     └──────────────┘     └──────────────┘
                              │                      │
                              ▼                      ▼
                        ┌──────────┐          ┌──────────┐
                        │  Tests   │          │ Staging  │
                        │  Lint    │          │   or     │
                        │  Build   │          │Production│
                        └──────────┘          └──────────┘
```

## CI Pipeline (`.github/workflows/ci.yml`)

### Triggers
- **Push**: to `main` and `develop` branches
- **Pull Request**: targeting `main` and `develop` branches

### Jobs

#### 1. Lint & Format Check
- Runs ESLint for code quality
- Runs Prettier for code formatting
- Fails on any violations

#### 2. TypeScript Check
- Validates all TypeScript types
- Ensures no type errors exist

#### 3. Unit Tests
- Runs Jest unit tests
- Generates coverage reports
- Uploads to Codecov
- Minimum coverage: 30% (target: 80%)

#### 4. E2E Tests
- Runs Playwright tests
- Tests critical user flows
- Uploads test reports as artifacts

#### 5. Build Validation
- Builds production bundle
- Validates output structure
- Checks for required files

#### 6. Security Checks
- Runs `npm audit`
- Scans for exposed secrets with Trufflehog
- Reports vulnerabilities

#### 7. Bundle Analysis
- Analyzes bundle sizes
- Enforces size limits:
  - Main JS: < 500KB
  - Main CSS: < 100KB

## CD Pipeline (`.github/workflows/deploy.yml`)

### Staging Deployment

**Trigger**: Push to `develop` branch

**Process**:
1. Run all CI checks
2. Build with staging environment variables
3. Deploy frontend to Vercel (preview)
4. Deploy backend to Railway (staging)
5. Run smoke tests
6. Post deployment notification

### Production Deployment

**Trigger**: Manual workflow dispatch from `main` branch

**Process**:
1. Require manual approval
2. Run comprehensive test suite
3. Create backup tag
4. Build with production variables
5. Deploy frontend to Vercel
6. Deploy backend to Railway
7. Run smoke tests
8. Monitor for 5 minutes
9. Create GitHub release

### Rollback Process
```bash
# Automatic rollback on smoke test failure
# Manual rollback:
git checkout production-backup-TIMESTAMP
./scripts/deploy/rollback-production.sh
```

## Environment Configuration

### Staging
- URL: https://staging.alfalyzer.com
- Auto-deploy from `develop`
- Uses staging API keys
- Relaxed rate limits

### Production
- URL: https://alfalyzer.com
- Manual deploy from `main`
- Uses production API keys
- Strict rate limits
- CDN enabled

## Quality Gates

### Required Checks
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ ESLint passes
- ✅ Prettier formatted
- ✅ Bundle size limits met
- ✅ No high-severity vulnerabilities

### Code Coverage Requirements
```yaml
coverageThreshold:
  global:
    branches: 30    # Current
    functions: 30   # Target: 80%
    lines: 30       # Target: 80%
    statements: 30  # Target: 80%
```

## Monitoring & Alerts

### Error Tracking (Sentry)
- Real-time error monitoring
- Performance tracking
- Release tracking
- User session replay

### Performance Monitoring
- Web Vitals tracking
- API response times
- Bundle size trends
- Long task detection

### Deployment Notifications
- GitHub PR comments
- Slack notifications (optional)
- Email alerts for failures

## Local Development

### Pre-commit Hooks (Husky)
```bash
# Automatically runs on commit:
- ESLint fix
- Prettier format
- TypeScript check
- Commit message validation
```

### Pre-push Hooks
```bash
# Runs before push:
- Unit tests
- TypeScript check
```

## Scripts

### Deployment Scripts
```bash
# Deploy to staging
./scripts/deploy/deploy-staging.sh

# Deploy to production (requires confirmation)
./scripts/deploy/deploy-production.sh
```

### Utility Scripts
```bash
# Run all checks locally
npm run lint:check
npm run format:check
npm run check
npm test

# Fix issues
npm run lint
npm run format
```

## Secrets Management

### GitHub Secrets Required
```
# Deployment
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
RAILWAY_TOKEN_STAGING
RAILWAY_TOKEN_PRODUCTION

# Environment
STAGING_API_URL
STAGING_SUPABASE_URL
STAGING_SUPABASE_ANON_KEY
STAGING_STRIPE_PUBLISHABLE_KEY
PRODUCTION_API_URL
PRODUCTION_SUPABASE_URL
PRODUCTION_SUPABASE_ANON_KEY
PRODUCTION_STRIPE_PUBLISHABLE_KEY

# Monitoring
CODECOV_TOKEN
SLACK_WEBHOOK (optional)

# CDN
CLOUDFLARE_ZONE_ID
CLOUDFLARE_API_TOKEN
```

## Best Practices

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature branches
- `hotfix/*`: Emergency fixes

### Commit Messages
Follow conventional commits:
```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
perf: Improve performance
test: Add tests
build: Update build config
ci: Update CI config
chore: Update dependencies
```

### Testing Strategy
1. **Unit Tests**: Business logic, utilities
2. **Integration Tests**: API endpoints
3. **E2E Tests**: Critical user flows
4. **Smoke Tests**: Post-deployment validation

### Performance Budget
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Total Blocking Time: < 300ms
- Cumulative Layout Shift: < 0.1

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm ci
npm run build
```

#### Test Failures
```bash
# Run tests in watch mode
npm run test:watch

# Debug E2E tests
npm run test:e2e:ui
```

#### Deployment Failures
```bash
# Check deployment logs
gh run list --workflow=deploy.yml
gh run view RUN_ID

# Verify environment variables
npm run validate:env
```

## Maintenance

### Weekly Tasks
- Review and merge Dependabot PRs
- Check bundle size trends
- Review error rates in Sentry
- Update dependencies

### Monthly Tasks
- Security audit
- Performance review
- API quota check
- Cost analysis

## Future Improvements

1. **Container Support**: Add Docker builds
2. **Multi-region Deployment**: Deploy to multiple regions
3. **Blue-Green Deployments**: Zero-downtime deployments
4. **Automated Rollbacks**: Auto-rollback on metric degradation
5. **Feature Flags**: Progressive rollouts
6. **A/B Testing**: Built-in experimentation

---

For questions or issues, contact the DevOps team or create an issue in the repository.