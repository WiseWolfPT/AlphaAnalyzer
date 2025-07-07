# CI/CD Quick Start Guide

## 🚀 Immediate Actions Required

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Husky
```bash
npx husky install
```

### 3. Test Your Setup
```bash
# Run all quality checks
npm run lint:check
npm run format:check
npm run check
npm test -- --passWithNoTests

# Fix any issues
npm run lint
npm run format
```

### 4. Make Your First Commit
```bash
git add .
git commit -m "ci: configure CI/CD pipeline with tests and monitoring"
```

## 📋 Daily Development Workflow

### Before Starting Work
```bash
git pull origin develop
npm install  # If package.json changed
```

### While Developing
```bash
# Your changes are automatically checked on:
# - Pre-commit: Linting and formatting
# - Pre-push: Tests and type checking
```

### Deploying to Staging
```bash
# Merge to develop branch
git checkout develop
git merge your-feature-branch
git push origin develop
# Automatic deployment triggered!
```

### Deploying to Production
```bash
# 1. Ensure you're on main
git checkout main
git pull origin main

# 2. Run deployment script
./scripts/deploy/deploy-production.sh
# Follow the prompts carefully
```

## 🔍 Monitoring Your Application

### Check Build Status
- GitHub Actions: https://github.com/your-org/alfalyzer/actions
- Look for ✅ green checks or ❌ red failures

### Monitor Errors (After Sentry Setup)
- Real-time errors in Sentry dashboard
- Performance metrics in browser console (dev mode)

### View Test Coverage
- After each CI run, check the coverage report
- Target: 30% immediate, 80% long-term

## 🛠️ Common Commands

```bash
# Development
npm run dev              # Start development servers

# Testing
npm test                 # Run unit tests
npm run test:e2e        # Run E2E tests
npm run test:coverage   # Run tests with coverage

# Code Quality
npm run lint            # Fix linting issues
npm run format          # Format code
npm run check           # TypeScript check

# Building
npm run build           # Build for production

# Deployment
./scripts/deploy/deploy-staging.sh     # Deploy to staging
./scripts/deploy/deploy-production.sh  # Deploy to production
```

## ⚠️ Important Notes

1. **Never commit directly to `main`** - Always use pull requests
2. **Keep commits small and focused** - Easier to review and debug
3. **Write meaningful commit messages** - Follow conventional commits
4. **Run tests locally before pushing** - Saves CI time
5. **Monitor bundle size** - Keep main bundle under 500KB

## 🆘 Troubleshooting

### ESLint/Prettier Conflicts
```bash
npm run format
npm run lint
```

### Failed Deployments
1. Check GitHub Actions logs
2. Verify all environment variables are set
3. Ensure tests are passing
4. Check for uncommitted changes

### Test Failures
```bash
# Run specific test file
npm test -- path/to/test.spec.ts

# Run tests in watch mode
npm run test:watch
```

## 📈 Success Metrics

- ✅ All CI checks passing
- ✅ Zero ESLint errors
- ✅ 100% Prettier formatted
- ✅ TypeScript strict mode
- ✅ 30%+ test coverage
- ✅ Bundle < 500KB
- ✅ Web Vitals "Good"

---

**Need Help?** Check `/docs/CI_CD_PIPELINE.md` for detailed documentation.