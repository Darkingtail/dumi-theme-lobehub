const config = require('@lobehub/lint').eslint;

module.exports = {
  ...config,
  rules: {
    ...config.rules,
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-useless-catch': 'warn',
    'unicorn/prefer-string-replace-all': 0,
    'unused-imports/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
};
