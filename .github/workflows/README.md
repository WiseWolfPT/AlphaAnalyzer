# Alfalyzer CI/CD Pipeline Documentation

This directory contains GitHub Actions workflows for the Alfalyzer project, implementing comprehensive CI/CD with cost protection and security measures.

## 🚀 Workflows Overview

### 1. CI Pipeline (`ci.yml`)
**Triggers:** Push to main/develop/restore-workflows, Pull Requests
**Purpose:** Continuous Integration with cost protection

**Jobs:**
- **Cost Protection Pre-Check** - Validates deployment costs before proceeding
- **Security Audit** - Comprehensive security scanning
- **Lint and Type Check** - Code quality validation
- **Test** - Run test suites
- **Build** - Build application artifacts
- **Health Check** - Validate application health
- **Deployment Readiness** - Final validation before deployment

### 2. Deploy to Staging (`deploy-staging.yml`)
**Triggers:** Push to develop branch, Manual dispatch
**Purpose:** Automated staging deployments with validation

**Jobs:**
- **Cost Protection** - Staging-specific cost validation
- **Pre-deployment Tests** - Security and build validation
- **Deploy Staging** - Deploy to Vercel staging environment
- **Post-deployment Validation** - Health checks and performance validation
- **Rollback on Failure** - Automatic rollback if deployment fails

### 3. Deploy to Production (`deploy-production.yml`)
**Triggers:** Manual dispatch only (requires approval)
**Purpose:** Production deployments with maximum safety

**Jobs:**
- **Production Cost Protection** - Strict cost validation
- **Manual Approval** - Required human approval step
- **Comprehensive Testing** - Full test suite execution
- **Backup Current Production** - Create deployment backup
- **Deploy Production** - Deploy to production environment
- **Post-deployment Monitoring** - Extensive health and performance checks
- **Automatic Rollback** - Emergency rollback procedures

### 4. Security Audit (`security-audit.yml`)
**Triggers:** Daily schedule (2 AM UTC), Manual dispatch, Security-related file changes
**Purpose:** Continuous security monitoring

**Jobs:**
- **Security Scan** - NPM audit, secret detection, code analysis
- **Cost Protection Audit** - Validate cost protection mechanisms
- **Infrastructure Security** - Docker and deployment security checks
- **Notification** - Security status reporting

## 🛡️ Cost Protection Features

### Pre-deployment Cost Checks
- Estimate deployment costs before execution
- Validate against environment-specific limits
- Check for cost protection mechanisms
- Emergency cost override capabilities

### Cost Limits by Environment
- **Development:** $10 max, $5 warning
- **Staging:** $50 max, $25 warning  
- **Production:** $200 max, $100 warning

### Cost Protection Mechanisms Validated
- Cost protection middleware
- Budget monitoring services
- Emergency switches
- API quota tracking
- Cache configuration
- Rate limiting

## 🔒 Security Features

### Automated Security Scanning
- NPM vulnerability audits
- Secret detection (API keys, credentials)
- Code security analysis (SQL injection, XSS patterns)
- Environment security validation
- CORS and security headers verification

### Security Thresholds
- **Critical vulnerabilities:** Deployment blocked
- **High vulnerabilities:** Warning issued
- **Secrets detected:** Deployment blocked
- **Missing security headers:** Warning issued

## 📊 Deployment Environments

### Staging Environment
- **URL:** `https://alfalyzer-staging.vercel.app`
- **Auto-deployment:** Enabled for develop branch
- **Cost limit:** $50
- **Approval:** Not required

### Production Environment
- **URL:** `https://alfalyzer.vercel.app`
- **Auto-deployment:** Disabled (manual only)
- **Cost limit:** $200
- **Approval:** Required

## 🔧 Required GitHub Secrets

Add these secrets to your GitHub repository settings:

```bash
# Vercel Deployment
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id

# Cost Protection (Optional)
COST_PROTECTION_API_KEY=your_cost_api_key
EMERGENCY_CONTACT_EMAIL=admin@alfalyzer.com
```

## 🚨 Emergency Procedures

### Emergency Deployment
Use production workflow with these inputs:
- `cost_override`: true
- `skip_tests`: true
- This bypasses normal safety checks for critical fixes

### Cost Protection Override
For legitimate cost overrides:
1. Set `cost_override` to `true` in workflow dispatch
2. Provide justification in deployment notes
3. Monitor deployment costs closely

### Rollback Procedures
Automatic rollback triggers:
- Health check failures
- Performance degradation
- Security scan failures
- Cost limit breaches

## 📋 Manual Workflow Triggers

### Staging Deployment
```bash
# Via GitHub CLI
gh workflow run deploy-staging.yml

# Via GitHub UI
Actions → Deploy to Staging → Run workflow
```

### Production Deployment
```bash
# Via GitHub CLI
gh workflow run deploy-production.yml \
  -f version=main \
  -f cost_override=false \
  -f skip_tests=false

# Via GitHub UI
Actions → Deploy to Production → Run workflow
Required inputs:
- version: main/develop/feature-branch
- cost_override: false (true for emergency)
- skip_tests: false (true for emergency)
```

### Security Audit
```bash
# Via GitHub CLI
gh workflow run security-audit.yml -f audit_type=full

# Via GitHub UI
Actions → Security Audit → Run workflow
Optional inputs:
- audit_type: full/dependencies/secrets/code
```

## 📈 Monitoring and Metrics

### Cost Monitoring
- Real-time cost tracking during deployments
- Cost breakdown reporting
- Budget alerts and notifications
- Historical cost analysis

### Security Monitoring
- Daily automated security scans
- Vulnerability trend tracking
- Security metric reporting
- Incident response automation

### Performance Monitoring
- Deployment success rates
- Build time optimization
- Health check response times
- Rollback frequency tracking

## 🔧 Local Development Commands

Test CI/CD components locally:

```bash
# Run cost protection check
npm run ci:cost-check

# Run deployment readiness check
npm run ci:deploy-check

# Run security audit
npm run ci:security-audit

# Validate before deployment
npm run validate:before-deploy
```

## 🆘 Troubleshooting

### Common Issues

**1. Cost Protection Failure**
```bash
# Check cost protection status
npm run cost-protection:status

# Validate mechanisms
npm run cost-protection:validate

# Reset if needed
npm run cost-protection:emergency-off
```

**2. Build Failures**
```bash
# Check TypeScript errors
npm run type-check

# Validate build locally
npm run build

# Check dependency issues
npm audit
```

**3. Deployment Failures**
```bash
# Check deployment readiness
npm run ci:deploy-check

# Validate environment
npm run env:validate

# Check health endpoints
npm run health:check
```

### Support Contacts

- **CI/CD Issues:** Development Team
- **Security Issues:** Security Team
- **Cost Issues:** Finance Team
- **Emergency:** `admin@alfalyzer.com`

## 📚 Additional Resources

- [Cost Protection Implementation](../COST_PROTECTION_IMPLEMENTATION_COMPLETE.md)
- [Security Testing Guide](../SECURITY_TESTING.md)
- [Deployment Guide](../DEPLOYMENT_INSTRUCTIONS.md)
- [Troubleshooting Guide](../TROUBLESHOOTING_GUIDE.md)

---

**Last Updated:** 2025-07-07
**Version:** 1.0.0
**Maintainer:** Alfalyzer Development Team