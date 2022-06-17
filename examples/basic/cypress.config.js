const { defineConfig } = require('cypress')
const tasks = require('cypress-firebase/lib/tasks')
const cypressFirebasePlugin = require('cypress-firebase').plugin
const admin = require('firebase-admin')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    // supportFile: false,
    supportFile: 'cypress/support/e2e/index.js',
    setupNodeEvents(on, config) {
      cypressFirebasePlugin(on, config, admin)
      // e2e testing node events setup code
    },
  },
  // component: {
  //   setupNodeEvents(on, config) {
  //     // component testing node events setup code
  //   },
  // },
})