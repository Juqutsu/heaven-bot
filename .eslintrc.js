module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'prefer-const': 'warn',
    'no-var': 'error',
    'prefer-arrow-callback': 'warn',
    'arrow-spacing': 'warn',
    'no-trailing-spaces': 'warn',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'comma-dangle': ['error', 'never'],
    'indent': ['error', 2, { SwitchCase: 1 }],
    'brace-style': ['error', '1tbs'],
    'curly': ['error', 'all'],
    'eqeqeq': ['error', 'always'],
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error'
  }
};

