import chalk from 'chalk';
import { writeFile } from 'fs';
import { pickBy, get, isUndefined } from 'lodash';
import { promisify } from 'util';
import {
  envVarBasedOnCIEnv,
  getServiceAccount,
  readJsonFile,
  getCypressConfigPath,
  withEnvPrefix,
  getEnvironmentSlug,
} from './node-utils';
import { to } from './utils';
import { DEFAULT_TEST_ENV_FILE_NAME } from './constants';
import { FIREBASE_CONFIG_FILE_PATH, TEST_ENV_FILE_PATH } from './filePaths';
import * as logger from './logger';

const writeFilePromise = promisify(writeFile);

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
  // Get UID from environment (falls back to cypress/config.json for local)
  const varName = 'TEST_UID';
  const uid = envVarBasedOnCIEnv(varName, envName);
  // Throw if UID is missing in environment
  if (!uid) {
    const errMsg = `${chalk.cyan(
      varName,
    )} is missing from environment. Confirm that either ${chalk.cyan(
      withEnvPrefix(varName),
    )} or ${chalk.cyan(
      varName,
    )} are set within environment variables, ${chalk.cyan(
      DEFAULT_TEST_ENV_FILE_NAME,
    )}, or ${chalk.cyan(getCypressConfigPath())}.`;
    throw new Error(errMsg);
  }

  // Get project from .firebaserc
  const firebaserc = readJsonFile(FIREBASE_CONFIG_FILE_PATH);

  const currentCypressEnvSettings = readJsonFile(TEST_ENV_FILE_PATH);

  const envSlug = envName || getEnvironmentSlug();

  // Get service account from local file falling back to environment variables
  const serviceAccount = getServiceAccount(envName);

  // Confirm service account has all parameters
  const serviceAccountMissingParams = pickBy(serviceAccount, isUndefined);

  if (Object.keys(serviceAccountMissingParams).length > 0) {
    const errMsg = `Service Account is missing parameters: ${Object.keys(
      serviceAccountMissingParams,
    ).join(', ')}`;
    throw new Error(errMsg);
  }

  const FIREBASE_PROJECT_ID =
    get(serviceAccount, 'project_id') ||
    get(currentCypressEnvSettings, 'FIREBASE_PROJECT_ID') || // FIREBASE_PROJECT_ID already in cypress config
    envVarBasedOnCIEnv('FIREBASE_PROJECT_ID', envSlug) || // FIREBASE_PROJECT_ID Environment variables
    envVarBasedOnCIEnv('FIREBASE_PROJECT', envSlug) || // FIREBASE_PROJECT Environment variables
    get(firebaserc, `ci.createConfig.${envSlug}.firebase.projectId`) || // CI createConfig projectId based on branch
    get(firebaserc, `projects.${envSlug}`) || // project by branch name
    get(firebaserc, 'ci.createConfig.master.firebase.projectId') || // CI createConfig projectId based on branch
    get(firebaserc, 'projects.master') ||
    get(firebaserc, 'projects.default', '');

  logger.info(
    `Generating custom auth token for Firebase project with projectId: ${chalk.cyan(
      FIREBASE_PROJECT_ID,
    )}`,
  );

  // Remove firebase- prefix (was added to database names for a short period of time)
  const cleanedProjectId = FIREBASE_PROJECT_ID.replace('firebase-', '');

  // TODO: Look into if inline require is still needed
  // It used to be associated with an error in utils when loaded in browser
  // environment (the reason why node-utils exists).
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
      get(
        firebaserc,
        `ci.createConfig.${envSlug}.firebase.apiKey`,
        get(firebaserc, `ci.createConfig.master.firebase.apiKey`),
      ),
    FIREBASE_AUTH_JWT: customToken,
  };

  // Write config file to cypress.env.json
  await writeFilePromise(
    TEST_ENV_FILE_PATH,
    JSON.stringify(newCypressConfig, null, 2),
  );

  logger.success(
    `${chalk.cyan(DEFAULT_TEST_ENV_FILE_NAME)} updated successfully`,
  );

  return newCypressConfig;
}
