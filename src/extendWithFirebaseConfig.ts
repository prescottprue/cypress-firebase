import type * as Cypress from 'cypress';

export interface CypressEnvironmentOptions {
  envName?: string;
  firebaseProjectId?: string;
  [k: string]: any;
}

export interface ExtendedCypressConfigEnv {
  [k: string]: any;
  FIREBASE_AUTH_EMULATOR_HOST?: string;
  FIRESTORE_EMULATOR_HOST?: string;
  FIREBASE_DATABASE_EMULATOR_HOST?: string;
  GCLOUD_PROJECT?: string;
}

export interface ExtendedCypressConfigBase {
  env: ExtendedCypressConfigEnv;
  expose?: ExtendedCypressConfigEnv;
}

export type ExtendedCypressConfig = Cypress.PluginConfigOptions &
  ExtendedCypressConfigBase;

export interface ExtendWithFirebaseConfigSettings {
  localBaseUrl?: string;
  localHostPort?: string | number;
}

/**
 * Check whether the host Cypress version supports the expose configuration
 * option (added in Cypress 15.10). Older versions reject unknown config keys.
 * @param cypressConfig - Existing Cypress config
 * @returns Whether the expose config option is supported
 */
function supportsExpose(cypressConfig: Cypress.PluginConfigOptions): boolean {
  const version = cypressConfig && (cypressConfig as any).version;
  if (typeof version !== 'string') {
    return false;
  }
  const [major, minor] = version.split('.').map(Number);
  return major > 15 || (major === 15 && minor >= 10);
}

/**
 * Load config for Cypress from environment variables. Loads
 * FIREBASE_AUTH_EMULATOR_HOST, FIRESTORE_EMULATOR_HOST,
 * FIREBASE_DATABASE_EMULATOR_HOST, and GCLOUD_PROJECT variable
 * values from environment to pass to Cypress environment. On Cypress >=
 * 15.10 the values are also exposed (Cypress.expose) since they are not
 * sensitive and Cypress.env is deprecated (removed in Cypress 16).
 * @param cypressConfig - Existing Cypress config
 * @returns Cypress config extended with environment variables
 */
export default function extendWithFirebaseConfig(
  cypressConfig: Cypress.PluginConfigOptions,
): ExtendedCypressConfig {
  const valuesFromEnv = [
    'FIREBASE_AUTH_EMULATOR_HOST',
    'FIREBASE_DATABASE_EMULATOR_HOST',
    'FIRESTORE_EMULATOR_HOST',
    'GCLOUD_PROJECT',
  ].reduce(
    (acc, varKey) =>
      // biome-ignore lint/performance/noAccumulatingSpread: list is small
      process.env[varKey] ? { ...acc, [varKey]: process.env[varKey] } : acc,
    {},
  );
  // Merge with original config (so it is not runover)
  const extendedConfig: ExtendedCypressConfig = {
    ...cypressConfig,
    env: {
      ...valuesFromEnv,
      ...((cypressConfig && cypressConfig.env) || {}),
    },
  };
  // Emulator hosts and project id are not sensitive - expose them for
  // synchronous access in the browser (i.e. Cypress.expose) so support
  // files can read them outside of test context
  if (supportsExpose(cypressConfig)) {
    extendedConfig.expose = {
      ...valuesFromEnv,
      ...((cypressConfig && (cypressConfig as any).expose) || {}),
    };
  }
  return extendedConfig;
}
