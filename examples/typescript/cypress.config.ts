import { plugin as cypressFirebasePlugin } from 'cypress-firebase';
import { initializeApp } from 'firebase-admin/app';
import { defineConfig } from 'cypress';

initializeApp()

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config): Cypress.PluginConfigOptions {
      return cypressFirebasePlugin(on, config);
    },
  },
});
