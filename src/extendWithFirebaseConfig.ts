export interface CypressEnvironmentOptions {
  envName?: string;
  firebaseProjectId?: string;
  [k: string]: any;
}

export interface CypressConfig {
  env?: CypressEnvironmentOptions;
  baseUrl?: string;
  [k: string]: any;
}

export interface ExtendedCypressConfigEnv {
  [k: string]: any;
  FIRESTORE_EMULATOR_HOST?: string;
  FIREBASE_DATABASE_EMULATOR_HOST?: string;
  GCLOUD_PROJECT?: string;
}

export interface ExtendedCypressConfig {
  [k: string]: any;
  env: ExtendedCypressConfigEnv;
}

export interface ExtendWithFirebaseConfigSettings {
  localBaseUrl?: string;
  localHostPort?: string | number;
}

/**
 * Load config for Cypress from environment variables. Loads
 * FIRESTORE_EMULATOR_HOST, FIREBASE_DATABASE_EMULATOR_HOST, and
 * GCLOUD_PROJECT variable values from environment to pass to
 * Cypress environment
 * @param cypressConfig - Existing Cypress config
 * @returns Cypress config extended with environment variables
 */
export default function extendWithFirebaseConfig(
  cypressConfig: CypressConfig,
): ExtendedCypressConfig {
  let newEnv: any = {};
  if (cypressConfig?.env) {
    newEnv = cypressConfig.env;
  }
  const {
    FIREBASE_DATABASE_EMULATOR_HOST,
    FIRESTORE_EMULATOR_HOST,
    GCLOUD_PROJECT,
  } = process.env;
  if (FIRESTORE_EMULATOR_HOST && !newEnv.FIRESTORE_EMULATOR_HOST) {
    newEnv.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
  }
  if (
    FIREBASE_DATABASE_EMULATOR_HOST &&
    !newEnv.FIREBASE_DATABASE_EMULATOR_HOST
  ) {
    newEnv.FIREBASE_DATABASE_EMULATOR_HOST = FIREBASE_DATABASE_EMULATOR_HOST;
  }
  if (GCLOUD_PROJECT && !newEnv.GCLOUD_PROJECT) {
    newEnv.GCLOUD_PROJECT = GCLOUD_PROJECT;
  }
  // Return original config if baseUrl is already set (so it is not runover)
  return { ...cypressConfig, env: newEnv };
}
