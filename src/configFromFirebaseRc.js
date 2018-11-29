import { get } from 'lodash';
import fs from 'fs-extra';

function loadFirebaseRc() {
  const rcFilePath = `${process.cwd()}/.firebaserc`;
  if (!fs.existsSync(rcFilePath)) {
    throw new Error('.firebaserc file not found');
  }
  return fs.readJson(rcFilePath);
}

function getEnvNameFromConfig(config) {
  if (!config.env || !config.env.envName) {
    return 'local';
  }
  return config.env.envName;
}

function getFirebaseProjectIdFromConfig(config) {
  const projectIdFromConfig = get(config, 'env.firebaseProjectId');
  if (projectIdFromConfig) {
    return projectIdFromConfig;
  }
  return loadFirebaseRc().then((rcFile) => {
    const envName = getEnvNameFromConfig(config);
    const projectsConfig = get(rcFile, 'projects');
    const firebaseProjectId =
      projectsConfig[envName] ||
      projectsConfig.master ||
      projectsConfig.default;
    return firebaseProjectId;
  });
}

/**
 * Load config for Cypress from .firebaserc.
 * @param {Object} cypressConfig - Existing Cypress config
 * @param {Object} settings - Settings
 */
export default function configFromFirebaseRc(cypressConfig, settings = {}) {
  if (cypressConfig.baseUrl) {
    return cypressConfig;
  }
  const { localBaseUrl, localHostPort = '3000' } = settings;
  const envName = getEnvNameFromConfig(cypressConfig);
  return getFirebaseProjectIdFromConfig(cypressConfig).then(
    FIREBASE_PROJECT_ID => ({
      ...cypressConfig,
      FIREBASE_PROJECT_ID,
      baseUrl:
        envName === 'local'
          ? localBaseUrl || `http://localhost:${localHostPort}`
          : `https://${FIREBASE_PROJECT_ID}.firebaseapp.com`
    })
  );
}
