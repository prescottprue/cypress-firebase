import { isString } from 'lodash';
import path from 'path';
import fs from 'fs';
import {
  DEFAULT_BASE_PATH,
  DEFAULT_TEST_FOLDER_PATH,
  FIREBASE_TOOLS_YES_ARGUMENT,
  FALLBACK_TEST_FOLDER_PATH,
  SECOND_FALLBACK_TEST_FOLDER_PATH
} from './constants';

/**
 * Create data object with values for each document with keys being doc.id.
 * @param  {firebase.database.DataSnapshot} snapshot - Data for which to create
 * an ordered array.
 * @return {Object|Null} Object documents from snapshot or null
 */
export function dataArrayFromSnap(snap) {
  const data = [];
  if (snap.data && snap.exists) {
    data.push({ id: snap.id, data: snap.data() });
  }
  else if (snap.forEach) {
    snap.forEach((doc) => {
      data.push({ id: doc.id, data: doc.data() || doc });
    });
  }
  return data;
}

/**
 * Parse fixture path string into JSON with error handling
 * @param {String} unparsed - Unparsed string to be parsed into JSON
 */
export function parseFixturePath(unparsed) {
  if (isString(unparsed)) {
    try {
      return JSON.parse(unparsed);
    }
    catch (err) {
      console.log('Error parsing fixture to JSON:', err); // eslint-disable-line no-console
      return unparsed;
    }
  }
  return unparsed;
}

function getEnvironmentSlug() {
  return process.env.CI_ENVIRONMENT_SLUG || 'stage';
}

/**
 * Get prefix for current environment based on environment vars available
 * within CI. Falls back to staging (i.e. STAGE)
 * @return {String} Environment prefix string
 */
export function getEnvPrefix() {
  const envSlug = getEnvironmentSlug();
  return `${envSlug.toUpperCase()}_`;
}

function getServiceAccountPath() {
  return path.join(DEFAULT_BASE_PATH, 'serviceAccount.json');
}

/**
 * Get environment variable based on the current CI environment
 * @param  {String} varNameRoot - variable name without the environment prefix
 * @return {Any} Value of the environment variable
 * @example
 * envVarBasedOnCIEnv('FIREBASE_PROJECT_ID')
 * // => 'fireadmin-stage' (value of 'STAGE_FIREBASE_PROJECT_ID' environment var)
 */
export function envVarBasedOnCIEnv(varNameRoot) {
  const prefix = getEnvPrefix();
  const combined = `${prefix}${varNameRoot}`;

  // Config file used for environment (local, containers) from main test path (cypress/config.json)
  const localTestConfigPath = path.join(
    DEFAULT_BASE_PATH,
    DEFAULT_TEST_FOLDER_PATH,
    'config.json'
  );

  // Load test config from main test path (cypress/config.json)
  if (fs.existsSync(localTestConfigPath)) {
    const configObj = require(localTestConfigPath); // eslint-disable-line global-require, import/no-dynamic-require
    return configObj[combined] || configObj[varNameRoot];
  }

  // Fallback Attempt for Config file (test/ui)
  const fallbackConfigPath = path.join(
    DEFAULT_BASE_PATH,
    FALLBACK_TEST_FOLDER_PATH,
    'config.json'
  );

  // Load config from the fallback path if it exists (test/ui)
  if (fs.existsSync(fallbackConfigPath)) {
    const configObj = require(fallbackConfigPath); // eslint-disable-line global-require, import/no-dynamic-require
    return configObj[combined] || configObj[varNameRoot];
  }

  // Second Fallback Attempt for Config file (test/e2e)
  const fallback2ConfigPath = path.join(
    DEFAULT_BASE_PATH,
    SECOND_FALLBACK_TEST_FOLDER_PATH,
    'config.json'
  );

  // Load config from the fallback path if it exists (test/e2e)
  if (fs.existsSync(fallback2ConfigPath)) {
    const configObj = require(fallback2ConfigPath); // eslint-disable-line global-require, import/no-dynamic-require
    return configObj[combined] || configObj[varNameRoot];
  }

  // CI Environment (environment variables loaded directly)
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
    /* eslint-disable no-console */
    console.error(
      `${combinedVar} not found, make sure it is set within environment vars`
    );
    /* eslint-enable no-console */
  }
  try {
    if (isString(val)) {
      return JSON.parse(val);
    }
    return val;
  }
  catch (err) {
    /* eslint-disable no-console */
    console.error(`Error parsing ${combinedVar}`);
    /* eslint-enable no-console */
    return val;
  }
}

/**
 * Get service account from either local file or environment variables
 * @return {Object} Service account object
 */
export function getServiceAccount() {
  const serviceAccountPath = getServiceAccountPath();

  // Check for local service account file (Local dev)
  if (fs.existsSync(serviceAccountPath)) {
    return require(serviceAccountPath); // eslint-disable-line global-require, import/no-dynamic-require
  }
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
 * Convert slash path to Firestore reference
 * @param  {firestore.Firestore} firestoreInstance - Instance on which to
 * create ref
 * @param  {String} slashPath - Path to convert into firestore refernce
 * @return {firestore.CollectionReference|firestore.DocumentReference}
 */
export function slashPathToFirestoreRef(
  firestoreInstance,
  slashPath,
  options = {}
) {
  let ref = firestoreInstance;
  const srcPathArr = slashPath.split('/');
  srcPathArr.forEach((pathSegment) => {
    if (ref.collection) {
      ref = ref.collection(pathSegment);
    }
    else if (ref.doc) {
      ref = ref.doc(pathSegment);
    }
    else {
      throw new Error(`Invalid slash path: ${slashPath}`);
    }
  });

  // Apply limit to query if it exists
  if (options.limit && typeof ref.limit === 'function') {
    ref = ref.limit(options.limit);
  }

  return ref;
}

/**
 * Create command arguments string from an array of arguments by joining them
 * with a space including a leading space. If no args provided, empty string
 * is returned
 * @param  {Array} args - Command arguments to convert into a string
 * @return {String} Arguments section of command string
 */
export function getArgsString(args) {
  return args && args.length ? ` ${args.join(' ')}` : '';
}

/**
 * Add default Firebase arguments to arguments array.
 * @param {Array} args - arguments array
 * @param  {Object} [opts={}] - Options object
 * @param {Boolean} [opts.disableYes=false] - Whether or not to disable the
 * yes argument
 */
export function addDefaultArgs(Cypress, args, opts = {}) {
  const { disableYes = false } = opts;
  const newArgs = [...args];
  // TODO: Load this in a way that understands environment. Currently this will
  // go to the first project id that is defined, not which one should be used
  // for the specified environment
  const projectId = Cypress.env('firebaseProjectId')
    || Cypress.env('FIREBASE_PROJECT_ID')
    || Cypress.env('STAGE_FIREBASE_PROJECT_ID');
  // Include project id command so command runs on the current project
  if (!newArgs.includes('-P') || !newArgs.includes(projectId)) {
    newArgs.push('-P');
    newArgs.push(projectId);
  }
  // Add Firebase's automatic approval argument if it is not already in newArgs
  if (!disableYes && !newArgs.includes(FIREBASE_TOOLS_YES_ARGUMENT)) {
    newArgs.push(FIREBASE_TOOLS_YES_ARGUMENT);
  }
  return newArgs;
}
