/* ESLint configuration focusing on i18n: disallow raw literals in TSX */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'i18next'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  settings: {
    react: { version: 'detect' }
  },
  overrides: [
    {
      files: ['**/*.tsx'],
      rules: {
        // Warn on literal strings inside JSX (i18n hardening)
        'i18next/no-literal-string': [
          'warn',
          {
            mode: 'jsx-text-only',
            // Common technical attributes to ignore
            ignoreAttribute: [
              'className', 'id', 'key', 'data-testid', 'to', 'href', 'target', 'rel',
              'viewBox', 'fill', 'stroke', 'd', 'x', 'y', 'cx', 'cy', 'r', 'alt', 'title'
            ],
            // Allow numbers, currency symbols, simple units, punctuation
            ignore: ['^[\\d\\s.,%:$€+-]+$']
          }
        ]
      }
    }
  ]
};

