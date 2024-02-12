module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsdoc/recommended',
    'prettier',
  ],
  root: true,
  plugins: ['@typescript-eslint', 'prettier', 'jsdoc'],
  settings: {
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules', '/'],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    react: {
      version: '18.0',
    },
  },
  env: {
    browser: true,
    node: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/explicit-module-boundary-types': 0,
    'import/prefer-default-export': 0,
    'no-shadow': 0,
    'consistent-return': 0,
    'no-new': 0,
    'new-cap': 0,
    'no-return-await': 2,
    'jsdoc/newline-after-description': 0,
    'jsdoc/require-returns-type': 0,
    'jsdoc/require-param-type': 0,
    'import/extensions': 0,
    'prettier/prettier': [
      'error',
      {
        singleQuote: true, // airbnb
        trailingComma: 'all', // airbnb
      },
    ],
  },
  overrides: [
    {
      files: ['cmds/**'],
      rules: {
        'comma-dangle': ['error', { functions: 'never' }],
        '@typescript-eslint/explicit-function-return-type': 0,
        'prettier/prettier': [
          'error',
          {
            singleQuote: true, // airbnb
            trailingComma: 'none', // airbnb
          },
        ],
      },
    },
  ],
};
