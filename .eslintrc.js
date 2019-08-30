module.exports = {
  parser: '@typescript-eslint/parser',
  'extends': ['airbnb-base', 'prettier', 'plugin:@typescript-eslint/recommended', "prettier/@typescript-eslint"],
  root: true,
  plugins: ['@typescript-eslint', 'prettier'],
  settings: {
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules', '/'],
        extensions: [".js", ".jsx", ".ts", ".tsx"]
      }
    },
    react: {
      version: '16.0'
    }
  },
  env: {
    browser: true,
    node: true
  },
  rules: {
    "@typescript-eslint/no-explicit-any": 0,
    "import/prefer-default-export": 0,
    "no-shadow": 0,
    "consistent-return": 0,
    "no-new": 0,
    "new-cap": 0,
    "prettier/prettier": [
      'error',
      {
        singleQuote: true, // airbnb
        trailingComma: 'all', // airbnb
      }
    ]
  },
  overrides: [
    {
      files: ['cmds/**'],
      rules: {
        "comma-dangle": ["error", { "functions": "never" }],
        "@typescript-eslint/explicit-function-return-type": 0,
        "prettier/prettier": [
          'error',
          {
            singleQuote: true, // airbnb
            trailingComma: 'none', // airbnb
          }
        ]
      }
    }
  ]
}
