import admin from 'firebase-admin';
import { plugin as cypressFirebasePlugin } from 'cypress-firebase';

module.exports = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
) => {
  const extendedConfig = cypressFirebasePlugin(on, config)
  return extendedConfig
}
