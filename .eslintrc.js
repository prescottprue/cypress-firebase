module.exports = {
  parser: "babel-eslint",
  'extends': ['airbnb', 'prettier'],
  root: true,
  plugins: ['import', 'babel', 'prettier'],
  settings: {
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules', '/']
      }
    }
  },
  env: {
    browser: true,
    node: true
  },
  rules: {
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
  overrides: {
    files: ['cmds/**'],
    rules: {
      "comma-dangle": ["error", { "functions": "never" }],
      "prettier/prettier": [
        'error',
        {
          singleQuote: true, // airbnb
          trailingComma: 'none', // airbnb
        }
      ]
    }
  }
}
