import { defineConfig } from 'cypress'
import { plugin as cypressFirebasePlugin } from 'cypress-firebase'
import admin from 'firebase-admin'

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      return cypressFirebasePlugin(on, config, admin)
    },
  },
})
