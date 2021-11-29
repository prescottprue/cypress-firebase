module.exports = {
  'extends': [
    'react-app',
    'prettier',
  ],
  rules: {
    'no-console': 0,
    'no-unused-expressions': 0,
    'chai-friendly/no-unused-expressions': 2
  },
  overrides: [
    {
      files: ['cypress/**/*.ts'],
      parser: '@typescript-eslint/parser',
      'extends': [
        'prettier',
        'plugin:@typescript-eslint/recommended',
        "plugin:jsdoc/recommended"
      ],
      env: {
        mocha: true,
        'cypress/globals': true
      },
      plugins: [
        'cypress',
        'chai-friendly'
      ]
    }
  ]
}