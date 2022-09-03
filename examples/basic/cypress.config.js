const { defineConfig } = require('cypress')
const cypressFirebasePlugin = require('cypress-firebase').plugin
const { initializeApp } = require('firebase-admin/app');

// Initialize firebase-admin default app
initializeApp()

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e/index.js',
    setupNodeEvents(on, config) {
      return cypressFirebasePlugin(on, config)
    },
  },
  // Uncomment to enable for component testing
  // component: {
  //   setupNodeEvents(on, config) {
  //     return cypressFirebasePlugin(on, config)
  //   },
  // },
})