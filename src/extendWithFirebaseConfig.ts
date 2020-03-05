import { get } from 'lodash';
import { existsSync } from 'fs';
import { FIREBASE_CONFIG_FILE_NAME } from './constants';
import { readJsonFile } from './node-utils';

export interface CypressEnvironmentOptions {
  envName?: string;
  firebaseProjectId?: string;
  [k: string]: any;
}

export interface CypressConfig {
  env?: CypressEnvironmentOptions;
  baseUrl: string;
  [k: string]: any;
}

export interface ExtendedCypressConfig {
  [k: string]: any;
  FIREBASE_PROJECT_ID?: string;
  baseUrl: string;
}

export interface ExtendWithFirebaseConfigSettings {
  localBaseUrl?: string;
  localHostPort?: string | number;
}

interface FirebaseRcProjects {
  [name: string]: string;
}

interface FirebaseRc {
  projects?: FirebaseRcProjects;
}

/**
 * Load .firebaserc file
 * @returns Contents of .firebaserc file parsed as JSON
 */
function loadFirebaseRc(): FirebaseRc {
  const rcFilePath = `${process.cwd()}/${FIREBASE_CONFIG_FILE_NAME}`;
  if (!existsSync(rcFilePath)) {
    throw new Error(`${FIREBASE_CONFIG_FILE_NAME} file not found`);
  }
  return readJsonFile(rcFilePath);
}

/**
 * Get environment name from cypress config or default to "local"
 * @param cypressConfig - Cypress config object
 * @returns Environment name from config
 */
function getEnvNameFromConfig(cypressConfig: CypressConfig): string {
  if (!cypressConfig.env || !cypressConfig.env.envName) {
    return 'local';
  }
  return cypressConfig.env.envName;
}

/**
 * Get Firebase project id using Cypress config and config
 * loaded from .firebaserc
 * @param config - Cypress config object
 * @returns Id of firbase project
 */
export function getFirebaseProjectIdFromConfig(
  config: CypressConfig,
): string | undefined {
  const projectIdFromConfig = get(config, 'env.firebaseProjectId');
  if (projectIdFromConfig) {
    return projectIdFromConfig;
  }
  const firebaseRcConfig = loadFirebaseRc();
  const envName = getEnvNameFromConfig(config);
  const projectsConfig = firebaseRcConfig && firebaseRcConfig.projects;
  const firebaseProjectId =
    (projectsConfig && projectsConfig[envName]) ||
    projectsConfig?.master ||
    projectsConfig?.default;
  return firebaseProjectId;
}

/**
 * Load config for Cypress from .firebaserc.
 * @param cypressConfig - Existing Cypress config
 * @param settings - Settings
 * @returns Cypress config extended with FIREBASE_PROJECT_ID and baseUrl
 */
export default function extendWithFirebaseConfig(
  cypressConfig: CypressConfig,
  settings: ExtendWithFirebaseConfigSettings = {},
): ExtendedCypressConfig {
  let newEnv: any = {};
  if (cypressConfig && cypressConfig.env) {
    newEnv = cypressConfig.env;
  }
  const {
    FIREBASE_DATABASE_EMULATOR_HOST,
    FIRESTORE_EMULATOR_HOST,
  } = process.env;
  if (FIRESTORE_EMULATOR_HOST) {
    newEnv.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
  }
  if (FIREBASE_DATABASE_EMULATOR_HOST) {
    newEnv.FIREBASE_DATABASE_EMULATOR_HOST = FIREBASE_DATABASE_EMULATOR_HOST;
  }
  // Return original config if baseUrl is already set (so it is not runover)
  if (cypressConfig.baseUrl) {
    return { ...cypressConfig, env: newEnv };
  }
  const { localBaseUrl, localHostPort = '3000' } = settings as any;
  const envName = getEnvNameFromConfig(cypressConfig);
  const FIREBASE_PROJECT_ID = getFirebaseProjectIdFromConfig(cypressConfig);
  console.log('extended config:', {
    ...cypressConfig,
    FIREBASE_PROJECT_ID,
    env: newEnv,
    baseUrl:
      envName === 'local'
        ? localBaseUrl || `http://localhost:${localHostPort}`
        : `https://${FIREBASE_PROJECT_ID}.firebaseapp.com`,
  });
  // Extend Firebase config with new config
  return {
    ...cypressConfig,
    FIREBASE_PROJECT_ID,
    env: newEnv,
    baseUrl:
      envName === 'local'
        ? localBaseUrl || `http://localhost:${localHostPort}`
        : `https://${FIREBASE_PROJECT_ID}.firebaseapp.com`,
  };
}
