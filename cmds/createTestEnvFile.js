/**
 * createTestEnvFile commander component
 * To use add require('../cmds/deploy.js')(program) to your commander.js based node executable before program.parse
 */

const chalk = require('chalk');
const fs = require('fs');
const pickBy = require('lodash/pickBy');
const get = require('lodash/get');
const size = require('lodash/size');
const keys = require('lodash/keys');
const isUndefined = require('lodash/isUndefined');
const {
  envVarBasedOnCIEnv,
  getServiceAccount,
  getEnvPrefix,
  getCypressFolderPath,
  readJsonFile
} = require('../lib/utils');
const {
  DEFAULT_CONFIG_FILE_NAME,
  DEFAULT_TEST_ENV_FILE_NAME
} = require('../lib/constants');
const {
  FIREBASE_CONFIG_FILE_PATH,
  TEST_ENV_FILE_PATH
} = require('../lib/filePaths');
const logger = require('../lib/logger');

/**
 * @param  {functions.Event} event - Function event
 * @param {functions.Context} context - Functions context
 * @return {Promise}
 */
function createTestEnvFile(envName) {
  const envPrefix = getEnvPrefix(envName);
  // Get UID from environment (falls back to cypress/config.json for local)
  const uid = envVarBasedOnCIEnv('TEST_UID');
  const varName = `${envPrefix}TEST_UID`;
  const testFolderPath = getCypressFolderPath();
  const configPath = `${testFolderPath}/${DEFAULT_CONFIG_FILE_NAME}`;
  // Throw if UID is missing in environment
  if (!uid) {
    /* eslint-disable */
    const errMsg = `${chalk.cyan(varName)} is missing from environment. Confirm that ${chalk.cyan(configPath)} contains either ${chalk.cyan(varName)} or ${chalk.cyan('TEST_UID')}.`;
    /* eslint-enable */
    return Promise.reject(new Error(errMsg));
  }

  // Get project from .firebaserc
  const firebaserc = readJsonFile(FIREBASE_CONFIG_FILE_PATH);
  const FIREBASE_PROJECT_ID =
    envVarBasedOnCIEnv(`${envPrefix}FIREBASE_PROJECT_ID`) ||
    get(
      firebaserc,
      `projects.${envName}`,
      get(firebaserc, 'projects.default', '')
    );

  logger.info(
    `Generating custom auth token for Firebase project with projectId: ${chalk.cyan(
      FIREBASE_PROJECT_ID
    )}`
  );

  // Get service account from local file falling back to environment variables
  const serviceAccount = getServiceAccount(envName);

  // Confirm service account has all parameters
  const serviceAccountMissingParams = pickBy(serviceAccount, isUndefined);
  if (size(serviceAccountMissingParams)) {
    const errMsg = `Service Account is missing parameters: ${keys(
      serviceAccountMissingParams
    ).join(', ')}`;
    return Promise.reject(new Error(errMsg));
  }

  // Remove firebase- prefix
  const cleanedProjectId = FIREBASE_PROJECT_ID.replace('firebase-', '');

  // Handle service account not matching settings in config.json (local)
  if (
    envName !== 'local' &&
    serviceAccount.project_id !== FIREBASE_PROJECT_ID
  ) {
    /* eslint-disable no-console */
    logger.warn(
      `project_id in service account (${chalk.cyan(
        serviceAccount.project_id
      )}) does not match associated project in .firebaserc (${chalk.cyan(
        FIREBASE_PROJECT_ID
      )})`
    );
    /* eslint-enable no-console */
  }

  const admin = require('firebase-admin'); // eslint-disable-line global-require

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
    .then(customToken => {
      /* eslint-disable no-console */
      logger.success(
        `Custom token generated successfully, writing to ${chalk.cyan(
          DEFAULT_TEST_ENV_FILE_NAME
        )}`
      );
      /* eslint-enable no-console */
      // Remove firebase app
      appFromSA.delete();
      const currentCypressEnvSettings = readJsonFile(TEST_ENV_FILE_PATH);

      // Create config object to be written into test env file by combining with existing config
      const newCypressConfig = Object.assign({}, currentCypressEnvSettings, {
        TEST_UID: envVarBasedOnCIEnv('TEST_UID'),
        FIREBASE_API_KEY: envVarBasedOnCIEnv('FIREBASE_API_KEY'),
        FIREBASE_PROJECT_ID,
        FIREBASE_AUTH_JWT: customToken
      });
      const stageProjectId = envVarBasedOnCIEnv('STAGE_FIREBASE_PROJECT_ID');
      const stageApiKey = envVarBasedOnCIEnv('STAGE_FIREBASE_API_KEY');

      if (stageProjectId) {
        newCypressConfig.STAGE_FIREBASE_PROJECT_ID = stageProjectId;
        newCypressConfig.STAGE_FIREBASE_API_KEY = stageApiKey;
      }

      // Write config file to cypress.env.json
      fs.writeFileSync(
        TEST_ENV_FILE_PATH,
        JSON.stringify(newCypressConfig, null, 2)
      );

      logger.success(
        `${chalk.cyan(DEFAULT_TEST_ENV_FILE_NAME)} updated successfully`
      );
      return customToken;
    })
    .catch(err => {
      /* eslint-disable no-console */
      logger.error(
        `Custom token could not be generated for uid: ${chalk.cyan(uid)}`,
        err.message || err
      );
      /* eslint-enable no-console */
      return Promise.reject(err);
    });
}

/**
 * @name createTestEnvFile
 * @description Deploy to Firebase only on build branches (master, stage, prod)
 * @param {String} only - Only flag can be passed to deploy only specified
 * targets (e.g hosting, storage)
 * @example <caption>Basic</caption>
 * # make sure you serviceAccount.json exists
 * cypress-firebase createEnv
 */
module.exports = function runCreateTestEnvFile(program) {
  program
    .command('createTestEnvFile [envName]')
    .description(
      'Build configuration file containing a token for authorizing a firebase instance'
    )
    .action(envArg => {
      const envName = typeof envArg === 'string' ? envArg : 'local';
      return createTestEnvFile(envName)
        .then(() => process.exit(0))
        .catch(err => {
          logger.error(`Test env file could not be created:\n${err.message}`);
          process.exit(1);
          return Promise.reject(err);
        });
    });
};
