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
}

export type ExtendedCypressConfig = Cypress.PluginConfigOptions &
  ExtendedCypressConfigBase;

export interface ExtendWithFirebaseConfigSettings {
  localBaseUrl?: string;
  localHostPort?: string | number;
}

/**
 * Load config for Cypress from environment variables. Loads
 * FIREBASE_AUTH_EMULATOR_HOST, FIRESTORE_EMULATOR_HOST,
 * FIREBASE_DATABASE_EMULATOR_HOST, and GCLOUD_PROJECT variable
 * values from environment to pass to Cypress environment
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
      process.env[varKey] ? { ...acc, [varKey]: process.env[varKey] } : acc,
    {},
  );
  // Return merge with original config (so it is not runover)
  return {
    ...cypressConfig,
    env: {
      ...valuesFromEnv,
      ...((cypressConfig && cypressConfig.env) || {}),
    },
  };
}
