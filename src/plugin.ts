import extendWithFirebaseConfig, {
  ExtendedCypressConfig,
} from './extendWithFirebaseConfig';
import * as tasks from './tasks';

/**
 * Cypress plugin which attaches tasks used by custom commands
 * and returns modified Cypress config. Modified config includes
 * env setting with values of Firebase specific environment variables
 * such as GCLOUD_PROJECT, FIREBASE_DATABASE_EMULATOR_HOST,
 * FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST.
 * @param cypressOnFunc - on function from cypress plugins file
 * @param cypressConfig - Cypress config
 * @returns Extended Cypress config
 */
export default function pluginWithTasks(
  cypressOnFunc: Cypress.PluginEvents,
  cypressConfig: Partial<Cypress.PluginConfigOptions>,
): ExtendedCypressConfig {
  // Attach tasks to Cypress using on function
  // NOTE: any is used because cypress doesn't export Task or Tasks types
  cypressOnFunc('task', tasks as any);

  // Return extended config
  return extendWithFirebaseConfig(cypressConfig);
}
