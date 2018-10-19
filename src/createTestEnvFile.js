/* eslint-disable no-console */
import * as admin from 'firebase-admin';
import { pickBy, isUndefined, size, keys, isString } from 'lodash';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import {
  DEFAULT_TEST_FOLDER_PATH,
  FALLBACK_TEST_FOLDER_PATH,
  DEFAULT_BASE_PATH,
  DEFAULT_TEST_ENV_FILE_PATH,
  DEFAULT_SERVICE_ACCOUNT_PATH,
  DEFAULT_CONFIG_FILE_PATH
} from './constants';

const testConfigRelativePath = path.join(DEFAULT_TEST_FOLDER_PATH, DEFAULT_CONFIG_FILE_PATH);
const testConfigFullPath = path.join(DEFAULT_BASE_PATH, testConfigRelativePath);
const fallbackTestConfigRelativePath = path.join(FALLBACK_TEST_FOLDER_PATH, DEFAULT_CONFIG_FILE_PATH);
const fallbackTestConfigFullPath = path.join(DEFAULT_BASE_PATH, fallbackTestConfigRelativePath);
const testEnvFileFullPath = path.join(DEFAULT_BASE_PATH, DEFAULT_TEST_ENV_FILE_PATH);
const serviceAccountPath = path.join(DEFAULT_BASE_PATH, DEFAULT_SERVICE_ACCOUNT_PATH);
const localServiceAccountPath = serviceAccountPath.replace(DEFAULT_BASE_PATH, '');

const prefixesByCiEnv = {
  master: 'INT_',
  staging: 'STAGE_',
  test: 'TEST_',
  'int-b': 'INT_B_',
  'int-c': 'INT_C_'
};

/**
 * Get prefix for current environment based on environment vars available
 * within CI. Falls back to staging (i.e. STAGE)
 * @return {String} Environment prefix string
 */
function getEnvPrefix() {
  return (
    prefixesByCiEnv[process.env.BRANCH_NAME] || prefixesByCiEnv[process.env.CI_ENVIRONMENT_SLUG] || prefixesByCiEnv.staging
  );
}

function getEnvNameFromBranch() {
  return !process.env.BRANCH_NAME || process.env.BRANCH_NAME === 'master' ? 'int' : process.env.BRANCH_NAME;
}

/**
 * Get environment variable based on the current CI environment
 * @param  {String} varNameRoot - variable name without the environment prefix
 * @return {Any} Value of the environment variable
 * @example
 * envVarBasedOnCIEnv('FIREBASE_PROJECT_ID')
 * // => 'fireadmin-stage' (value of 'STAGE_FIREBASE_PROJECT_ID' environment var)
 */
function envVarBasedOnCIEnv(varNameRoot) {
  const prefix = getEnvPrefix();
  const combined = `${prefix}${varNameRoot}`;
  // Check for default location (cypress)
  if (fs.existsSync(testConfigFullPath)) {
    const configObj = require(testConfigFullPath); // eslint-disable-line global-require, import/no-dynamic-require
    // console.log(
    //   chalk.blue(`"${configObj[combined] ? combined : varNameRoot}"`),
    //   ` is being loaded from ${testConfigRelativePath}`
    // );
    return configObj[combined] || configObj[varNameRoot];
  }
  // Check for backup location (test/e2e)
  if (fs.existsSync(fallbackTestConfigFullPath)) {
    const configObj = require(fallbackTestConfigFullPath); // eslint-disable-line global-require, import/no-dynamic-require
    // console.log(
    //   chalk.blue(`"${configObj[combined] ? combined : varNameRoot}"`),
    //   ` is being loaded from ${fallbackTestConfigFullPath}`
    // );
    return configObj[combined] || configObj[varNameRoot];
  }
  const varName = process.env[combined] ? combined : varNameRoot;
  console.log(
    chalk.blue(`"${varName}"`),
    chalk.blue(`not found in ${testConfigRelativePath}. Attempting to load from environment variables...`)
  );
  return process.env[combined] || process.env[varNameRoot];
}

/**
 * Get parsed value of environment variable. Useful for environment variables
 * which have characters that need to be escaped.
 * @param  {String} varNameRoot - variable name without the environment prefix
 * @return {Any} Value of the environment variable
 * @example
 * getParsedEnvVar('FIREBASE_PRIVATE_KEY_ID')
 * // => 'fireadmin-stage' (parsed value of 'STAGE_FIREBASE_PRIVATE_KEY_ID' environment var)
 */
function getParsedEnvVar(varNameRoot) {
  const val = envVarBasedOnCIEnv(varNameRoot);
  const prefix = getEnvPrefix();
  const combinedVar = `${prefix}${varNameRoot}`;
  if (!val) {
    console.error(
      chalk.blue(`"${combinedVar}"`),
      chalk.yellow('not found, make sure it is set within environment vars')
    );
  }
  try {
    if (isString(val)) {
      return JSON.parse(val);
    }
    return val;
  }
  catch (err) {
    console.error(chalk.red(`Error parsing ${combinedVar}`));
    return val;
  }
}

/**
 * Get service account from either local file or environment variables
 * @return {Object} Service account object
 */
function getServiceAccount() {
  // Check for local service account file (Local dev)
  if (fs.existsSync(serviceAccountPath)) {
    console.log(chalk.blue('Local service account being loaded from'), chalk.yellow(`.${localServiceAccountPath}`));
    return require(serviceAccountPath); // eslint-disable-line global-require, import/no-dynamic-require
  }

  // Check for fallback local service account (when naming is serviceAccount-int.json or similar)
  const backServiceAccountPath = path.join(DEFAULT_BASE_PATH, `serviceAccount-${getEnvNameFromBranch()}.json`);
  if (fs.existsSync(backServiceAccountPath)) {
    console.log(`Local service account not found at ${localServiceAccountPath}, falling back to ${backServiceAccountPath}`);
    return require(backServiceAccountPath); // eslint-disable-line global-require, import/no-dynamic-require
  }

  console.log(
    chalk.yellow('Service Account file does not exist locally, falling back to environment variables...')
  );
  // Use environment variables (CI)
  return {
    type: 'service_account',
    project_id: envVarBasedOnCIEnv('FIREBASE_PROJECT_ID'),
    private_key_id: envVarBasedOnCIEnv('FIREBASE_PRIVATE_KEY_ID'),
    private_key: getParsedEnvVar('FIREBASE_PRIVATE_KEY'),
    client_email: envVarBasedOnCIEnv('FIREBASE_CLIENT_EMAIL'),
    client_id: envVarBasedOnCIEnv('FIREBASE_CLIENT_ID'),
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://accounts.google.com/o/oauth2/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: envVarBasedOnCIEnv('FIREBASE_CERT_URL')
  };
}

/**
 * @param  {functions.Event} event - Function event
 * @param {functions.Context} context - Functions context
 * @return {Promise}
 */
export default function createTestEnvFile() {
  const envPrefix = getEnvPrefix();

  // Get UID from environment (falls back to test/e2e/config.json for local)
  const uid = envVarBasedOnCIEnv('TEST_UID');

  // Throw if UID is missing in environment
  if (!uid) {
    return Promise.reject(new Error(
      `${envPrefix}TEST_UID is missing from environment. Confirm that ${
      DEFAULT_TEST_FOLDER_PATH
      }/config.json contains either ${envPrefix}TEST_UID or TEST_UID.`
    ));
  }
  const FIREBASE_PROJECT_ID = envVarBasedOnCIEnv('FIREBASE_PROJECT_ID');

  // Get service account from local file falling back to environment variables
  const serviceAccount = getServiceAccount();

  // Confirm service account has all parameters
  const serviceAccountMissingParams = pickBy(serviceAccount, isUndefined);
  if (size(serviceAccountMissingParams)) {
    const errMsg = `Service Account is missing parameters: ${keys(
      serviceAccountMissingParams
    ).join(', ')}`;
    return Promise.reject(new Error(errMsg));
  }

  // Get project ID from environment variable
  const projectId =
    process.env.GCLOUD_PROJECT || envVarBasedOnCIEnv('FIREBASE_PROJECT_ID');

  // Remove firebase- prefix
  const cleanedProjectId = projectId.replace('firebase-', '');

  // Handle service account not matching settings in config.json (local)
  if (serviceAccount.project_id !== FIREBASE_PROJECT_ID && serviceAccount.project_id !== projectId) {
    console.log(`Warning: project_id "${serviceAccount.project_id}" does not match env var: "${envVarBasedOnCIEnv('FIREBASE_PROJECT_ID')}"`);
  }

  // Initialize Firebase app with service account
  const appFromSA = admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${cleanedProjectId}.firebaseio.com`
    },
    'withServiceAccount'
  );

  // Create auth token
  return appFromSA
    .auth()
    .createCustomToken(uid, { isTesting: true })
    .then((customToken) => {
      console.log(
        'Custom token generated successfully, writing cypress.env.json...'
      );
      // Remove firebase app
      appFromSA.delete();

      // Create config object to be written into test env file
      const newCypressConfig = {
        TEST_UID: envVarBasedOnCIEnv('TEST_UID'),
        FIREBASE_PROJECT_ID,
        FIREBASE_AUTH_JWT: customToken
      };

      // Write config file to cypress.env.json
      fs.writeFileSync(testEnvFileFullPath, JSON.stringify(newCypressConfig, null, 2));

      console.log(chalk.blue(`${DEFAULT_TEST_ENV_FILE_PATH} created successfully`));

      // Create service account file if it does not already exist (for use in reporter)
      if (!fs.existsSync(serviceAccountPath)) {
        // Write service account file as string
        fs.writeFileSync(
          serviceAccountPath,
          JSON.stringify(serviceAccount, null, 2)
        );

        console.log('Service account created successfully');
      }
      return customToken;
    })
    .catch((err) => {
      /* eslint-disable no-console */
      console.error(
        `Error generating custom token for uid: ${uid}`,
        err.message || err
      );
      /* eslint-enable no-console */
      return Promise.reject(err);
    });
}

