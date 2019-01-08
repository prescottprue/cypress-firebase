import { get } from 'lodash';
import fs from 'fs';

/**
 * Load .firebaserc file
 */
function loadFirebaseRc() {
  const rcFilePath = `${process.cwd()}/.firebaserc`;
  if (!fs.existsSync(rcFilePath)) {
    throw new Error('.firebaserc file not found');
  }
  try {
    const fileStr = fs.readFileSync(rcFilePath);
    return JSON.parse(fileStr);
  } catch (err) {
    console.log('Error loading .firebaserc: ', err); // eslint-disable-line no-console
    throw err;
  }
}

/**
 * Get environment name from cypress config or default to "local"
 * @param {Object} cypressConfig - Cypress config object
 */
function getEnvNameFromConfig(cypressConfig) {
  if (!cypressConfig.env || !cypressConfig.env.envName) {
    return 'local';
  }
  return cypressConfig.env.envName;
}

/**
 * Get Firebase project id using Cypress config and config
 * loaded from .firebaserc
 * @param {Object} config - Cypress config object
 */
export function getFirebaseProjectIdFromConfig(config) {
  const projectIdFromConfig = get(config, 'env.firebaseProjectId');
  if (projectIdFromConfig) {
    return projectIdFromConfig;
  }
  const firbaseRcConfig = loadFirebaseRc();
  const envName = getEnvNameFromConfig(config);
  const projectsConfig = get(firbaseRcConfig, 'projects');
  const firebaseProjectId =
    projectsConfig[envName] || projectsConfig.master || projectsConfig.default;
  return firebaseProjectId;
}

/**
 * Load config for Cypress from .firebaserc.
 * @param {Object} cypressConfig - Existing Cypress config
 * @param {Object} settings - Settings
 */
export default function extendWithFirebaseConfig(cypressConfig, settings = {}) {
  // Return original config if baseUrl is already set (so it is not runover)
  if (cypressConfig.baseUrl) {
    return cypressConfig;
  }
  const { localBaseUrl, localHostPort = '3000' } = settings;
  const envName = getEnvNameFromConfig(cypressConfig);
  const FIREBASE_PROJECT_ID = getFirebaseProjectIdFromConfig(cypressConfig);
  // Extend Firebase config with new config
  return {
    ...cypressConfig,
    FIREBASE_PROJECT_ID,
    baseUrl:
      envName === 'local'
        ? localBaseUrl || `http://localhost:${localHostPort}`
        : `https://${FIREBASE_PROJECT_ID}.firebaseapp.com`,
  };
}
