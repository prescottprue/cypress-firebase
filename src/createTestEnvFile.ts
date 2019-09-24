import chalk from 'chalk';
import fs from 'fs';
import { pickBy, get, isUndefined } from 'lodash';
import {
  envVarBasedOnCIEnv,
  getServiceAccount,
  getEnvPrefix,
  readJsonFile,
  getCypressConfigPath,
} from './node-utils';
import { to } from './utils';
import { DEFAULT_TEST_ENV_FILE_NAME } from './constants';
import { FIREBASE_CONFIG_FILE_PATH, TEST_ENV_FILE_PATH } from './filePaths';
import * as logger from './logger';

/* eslint-disable no-irregular-whitespace */
/**
 * Create test environment file (cypress.env.json). Uses admin.auth().createCustomToken
 * from firebase-admin authenticated with a Service Account which is loaded from environment
 * variables or config.json in test folder. Parameters which are added/copied:
 * - `TEST_UID`
 * - `FIREBASE_API_KEY`
 * - `FIREBASE_PROJECT_ID`
 * - `FIREBASE_AUTH_JWT`
 * @param envName - Environment name
 * @returns Promise which resolves with the contents of the test env file
 */
export default async function createTestEnvFile(
  envName: string,
): Promise<string> {
  /* eslint-disable no-irregular-whitespace */
  const envPrefix = getEnvPrefix(envName);
  // Get UID from environment (falls back to cypress/config.json for local)
  const uid = envVarBasedOnCIEnv('TEST_UID', envName);
  const varName = `${envPrefix}TEST_UID`;
  // Throw if UID is missing in environment
  if (!uid) {
    const errMsg = `${chalk.cyan(
      'TEST_UID',
    )} is missing from environment. Confirm that ${chalk.cyan(
      TEST_ENV_FILE_PATH,
    )} or ${chalk.cyan(getCypressConfigPath())} contains either ${chalk.cyan(
      varName,
    )} or ${chalk.cyan('TEST_UID')}.`;
    return Promise.reject(new Error(errMsg));
  }

  // Get project from .firebaserc
  const firebaserc = readJsonFile(FIREBASE_CONFIG_FILE_PATH);

  const currentCypressEnvSettings = readJsonFile(TEST_ENV_FILE_PATH);

  const FIREBASE_PROJECT_ID =
    get(currentCypressEnvSettings, 'FIREBASE_PROJECT_ID') ||
    envVarBasedOnCIEnv('FIREBASE_PROJECT_ID', envName) ||
    envVarBasedOnCIEnv(`${envPrefix}FIREBASE_PROJECT_ID`, envName) ||
    envVarBasedOnCIEnv('FIREBASE_PROJECT_ID', envName) ||
    get(
      firebaserc,
      `projects.${envName}`,
      get(firebaserc, 'projects.default', ''),
    );

  logger.info(
    `Generating custom auth token for Firebase project with projectId: ${chalk.cyan(
      FIREBASE_PROJECT_ID,
    )}`,
  );

  // Get service account from local file falling back to environment variables
  const serviceAccount = getServiceAccount(envName);

  // Confirm service account has all parameters
  const serviceAccountMissingParams = pickBy(serviceAccount, isUndefined);

  if (Object.keys(serviceAccountMissingParams).length > 0) {
    const errMsg = `Service Account is missing parameters: ${Object.keys(
      serviceAccountMissingParams,
    ).join(', ')}`;
    return Promise.reject(new Error(errMsg));
  }

  // Remove firebase- prefix (was added to database names for a short period of time)
  const cleanedProjectId = FIREBASE_PROJECT_ID.replace('firebase-', '');

  const admin = require('firebase-admin'); // eslint-disable-line @typescript-eslint/no-var-requires, global-require

  // Initialize Firebase app with service account
  const appFromSA = admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${cleanedProjectId}.firebaseio.com`,
    },
    'withServiceAccount',
  );

  // Read developer claims object from cypress/config.json
  const developerClaims = envVarBasedOnCIEnv('DEVELOPER_CLAIMS', envName);
  // Check if object is empty. If not, return it, otherwise set developer claims as { isTesting: true }
  const defaultDeveloperClaims =
    !!developerClaims && Object.keys(developerClaims).length > 0
      ? developerClaims
      : { isTesting: true };

  // Create auth token
  const [err, customToken] = await to(
    appFromSA.auth().createCustomToken(uid, defaultDeveloperClaims),
  );

  // Handle errors generating custom token
  if (err) {
    logger.error(
      `Custom token could not be generated for uid: ${chalk.cyan(uid)}`,
      err.message || err,
    );
    throw err;
  }

  logger.success(
    `Custom token generated successfully, writing to ${chalk.cyan(
      DEFAULT_TEST_ENV_FILE_NAME,
    )}`,
  );

  // Remove firebase app
  appFromSA.delete();

  // Create config object to be written into test env file by combining with existing config
  const newCypressConfig = {
    ...currentCypressEnvSettings,
    TEST_UID: uid,
    FIREBASE_PROJECT_ID,
    FIREBASE_API_KEY:
      envVarBasedOnCIEnv('FIREBASE_API_KEY', envName) ||
      get(firebaserc, `ci.createConfig.${envName}.firebase.apiKey`),
    FIREBASE_AUTH_JWT: customToken,
  };

  const stageProjectId = envVarBasedOnCIEnv(
    'STAGE_FIREBASE_PROJECT_ID',
    envName,
  );
  const stageApiKey = envVarBasedOnCIEnv('STAGE_FIREBASE_API_KEY', envName);

  if (stageProjectId) {
    newCypressConfig.STAGE_FIREBASE_PROJECT_ID = stageProjectId;
    newCypressConfig.STAGE_FIREBASE_API_KEY = stageApiKey;
  }

  // Write config file to cypress.env.json
  fs.writeFileSync(
    TEST_ENV_FILE_PATH,
    JSON.stringify(newCypressConfig, null, 2),
  );

  logger.success(
    `${chalk.cyan(DEFAULT_TEST_ENV_FILE_NAME)} updated successfully`,
  );

  return newCypressConfig;
}
