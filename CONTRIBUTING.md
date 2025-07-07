# Contributing to Alfalyzer

First off, thank you for considering contributing to Alfalyzer! It's people like you that make Alfalyzer such a great tool for financial analysis.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## Code of Conduct

This project and everyone participating in it is governed by the Alfalyzer Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@alfalyzer.com](mailto:conduct@alfalyzer.com).

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment (see [Development Setup](#development-setup))
4. Create a branch for your changes
5. Make your changes
6. Test your changes
7. Submit a pull request

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if applicable**
- **Include your environment details** (OS, browser, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the proposed enhancement**
- **Explain why this enhancement would be useful**
- **List any alternatives you've considered**

### Code Contributions

#### First Time Contributors

Look for issues labeled with `good first issue` or `help wanted`. These are great starting points for newcomers.

#### Areas of Contribution

- **Frontend Components**: React components, UI/UX improvements
- **Backend APIs**: New endpoints, performance improvements
- **Data Integration**: New financial data sources, API integrations
- **Testing**: Unit tests, integration tests, E2E tests
- **Documentation**: Code documentation, user guides, API docs
- **Translations**: Help translate the app to other languages

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- SQLite (for local development)

### Setup Steps

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/alfalyzer.git
cd alfalyzer

# Add upstream remote
git remote add upstream https://github.com/alfalyzer/alfalyzer.git

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Development Workflow

1. **Keep your fork synced**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**:
   - Write clean, readable code
   - Follow the style guidelines
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes**:
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

5. **Commit your changes** (see [Commit Guidelines](#commit-guidelines))

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**

## Style Guidelines

### TypeScript/JavaScript

We use ESLint and Prettier for code formatting. Run `npm run lint` and `npm run format` before committing.

Key conventions:
- Use TypeScript for all new code
- Prefer functional components and hooks in React
- Use meaningful variable and function names
- Keep functions small and focused
- Add JSDoc comments for public APIs

```typescript
/**
 * Calculates the intrinsic value of a stock
 * @param cashFlow - Annual free cash flow
 * @param growthRate - Expected growth rate (as decimal)
 * @param discountRate - Discount rate (as decimal)
 * @returns Intrinsic value per share
 */
export function calculateIntrinsicValue(
  cashFlow: number,
  growthRate: number,
  discountRate: number
): number {
  // Implementation
}
```

### React Components

```typescript
interface StockCardProps {
  stock: Stock;
  onSelect?: (stock: Stock) => void;
  className?: string;
}

export function StockCard({ stock, onSelect, className }: StockCardProps) {
  // Component implementation
}
```

### CSS/Styling

- Use Tailwind CSS utilities
- Follow mobile-first design
- Use CSS modules for component-specific styles
- Maintain consistent spacing and sizing

### File Organization

```
src/
├── components/
│   ├── common/          # Shared components
│   ├── features/        # Feature-specific components
│   └── layouts/         # Layout components
├── hooks/               # Custom React hooks
├── services/            # API and external services
├── utils/               # Utility functions
└── types/               # TypeScript type definitions
```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Test additions or changes
- **chore**: Build process or auxiliary tool changes
- **perf**: Performance improvements

### Examples

```bash
# Feature
git commit -m "feat(portfolio): add portfolio performance chart"

# Bug fix
git commit -m "fix(auth): resolve login redirect issue"

# Documentation
git commit -m "docs(api): update stock endpoint documentation"

# With body
git commit -m "feat(watchlist): add bulk stock import

- Add CSV import functionality
- Support for multiple file formats
- Validate stock symbols before import

Closes #123"
```

## Pull Request Process

1. **Before submitting**:
   - Ensure all tests pass
   - Update documentation
   - Add tests for new functionality
   - Run linting and formatting

2. **PR Title**: Follow the same convention as commit messages

3. **PR Description**: Use the template provided and include:
   - Summary of changes
   - Related issue numbers
   - Screenshots (for UI changes)
   - Testing instructions
   - Checklist completion

4. **Review Process**:
   - At least one maintainer approval required
   - All CI checks must pass
   - Address review feedback promptly
   - Keep PR focused and reasonably sized

## Testing Guidelines

### Unit Tests

```typescript
import { render, screen } from '@testing-library/react';
import { StockCard } from '@/components/stock-card';

describe('StockCard', () => {
  it('should display stock information', () => {
    const stock = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 175.50
    };

    render(<StockCard stock={stock} />);
    
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('$175.50')).toBeInTheDocument();
  });
});
```

### Integration Tests

Test API endpoints and service integrations:

```typescript
import { api } from '@/lib/api';

describe('Stock API', () => {
  it('should fetch stock data', async () => {
    const data = await api.getStock('AAPL');
    
    expect(data).toHaveProperty('symbol', 'AAPL');
    expect(data).toHaveProperty('price');
  });
});
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('user can search for stocks', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="stock-search"]', 'AAPL');
  await page.press('[data-testid="stock-search"]', 'Enter');
  
  await expect(page.locator('text=Apple Inc.')).toBeVisible();
});
```

## Documentation

### Code Documentation

- Add JSDoc comments for all public functions and components
- Include parameter descriptions and return types
- Add examples for complex functionality

### README Updates

Update the README when:
- Adding new features
- Changing setup procedures
- Modifying API endpoints
- Adding new dependencies

### API Documentation

Document all API endpoints in the format:

```markdown
### Get Stock Quote

`GET /api/stocks/{symbol}/quote`

Get real-time quote for a stock.

**Parameters:**
- `symbol` (string, required): Stock symbol

**Response:**
```json
{
  "symbol": "AAPL",
  "price": 175.50,
  "change": 2.34,
  "changePercent": 1.35,
  "volume": 45234567
}
```

## Questions?

Feel free to:
- Open an issue for questions
- Join our [Discord community](https://discord.gg/alfalyzer)
- Email us at [dev@alfalyzer.com](mailto:dev@alfalyzer.com)

Thank you for contributing to Alfalyzer! 🚀