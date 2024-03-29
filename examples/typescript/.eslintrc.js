module.exports = {
  extends: ['react-app'],
  env: {
    mocha: true,
    // 'cypress/globals': true
  },
  plugins: ['cypress', 'chai-friendly'],
  rules: {
    'no-console': 0,
    'no-unused-expressions': 0,
    'chai-friendly/no-unused-expressions': 2,
  },
};
