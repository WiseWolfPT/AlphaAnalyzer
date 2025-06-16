# Deployment Workflow

This deployment workflow automates the complete process of deploying the Alpha Analyzer application with 14 financial charts to Vercel.

## Prerequisites

Set the following environment variables:

```bash
export GIT_REPO="https://github.com/username/repository.git"
export VERCEL_TOKEN="your-vercel-token"
export VERCEL_PROJECT_ID="your-project-id"
export VERCEL_ORG_ID="your-organization-id"
```

## Usage

### Option 1: Node.js Runner (Recommended)

```bash
node run-deploy.js
```

### Option 2: Shell Script

```bash
./deploy-workflow.sh
```

## What the Workflow Does

1. **Workspace Setup**: Creates a local workspace directory and clones the repository
2. **Branch Creation**: Creates and switches to `ci/auto-deploy` branch
3. **Patch Application**: Ensures all deployment requirements are met:
   - Verifies StockCharts.tsx exists with all 14 charts
   - Confirms correct routing for `/stock/:symbol`
   - Sets up VITE_ prefixed environment variables
   - Validates all chart components are present
4. **Build Testing**: Runs local build to ensure everything compiles correctly
5. **Git Operations**: Commits changes and pushes to remote repository
6. **Vercel Deployment**: Triggers deployment via Vercel API and monitors progress
7. **Validation**: Tests that the deployed application is working correctly

## Chart Components Verified

The workflow ensures all 14 required chart components exist:

1. Price Chart (`price-chart.tsx`)
2. Revenue Chart (`revenue-chart.tsx`)
3. Revenue Segment Chart (`revenue-segment-chart.tsx`)
4. EBITDA Chart (`ebitda-chart.tsx`)
5. Free Cash Flow Chart (`free-cash-flow-chart.tsx`)
6. Net Income Chart (`net-income-chart.tsx`)
7. EPS Chart (`eps-chart.tsx`)
8. Cash & Debt Chart (`cash-debt-chart.tsx`)
9. Dividends Chart (`dividends-chart.tsx`)
10. Return of Capital Chart (`return-capital-chart.tsx`)
11. Shares Outstanding Chart (`shares-chart.tsx`)
12. Financial Ratios Chart (`ratios-chart.tsx`)
13. Valuation Chart (`valuation-chart.tsx`)
14. Expenses Chart (`expenses-chart.tsx`)

## Output

On success, the workflow outputs:
```
✅ build OK → https://your-deployment-url.vercel.app
```

On failure, it outputs:
```
build FAIL - [error description]
```

## Error Handling

The workflow includes comprehensive error handling for:
- Missing environment variables
- Git operations failures
- Missing chart components
- Build failures
- Deployment timeouts
- Validation failures

## Files Created

- `workspace/` - Temporary workspace directory
- `.env.production` - Production environment variables
- Git branch `ci/auto-deploy` - Deployment branch

## Cleanup

The workflow automatically cleans up temporary files and returns to the original directory on completion.