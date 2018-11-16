/**
 * createTestEnvFile commander component
 * To use add require('../cmds/deploy.js')(program) to your commander.js based node executable before program.parse
 */

const chalk = require('chalk');
const fs = require('fs');
const pickBy = require('lodash/pickBy');
const size = require('lodash/size');
const keys = require('lodash/keys');
const isUndefined = require('lodash/isUndefined');
const envVarBasedOnCIEnv = require('../lib/utils').envVarBasedOnCIEnv;
const getServiceAccount = require('../lib/utils').getServiceAccount;
const getEnvPrefix = require('../lib/utils').getEnvPrefix;
const constants = require('../lib/constants');
const path = require('path');

const {
  DEFAULT_BASE_PATH,
  DEFAULT_TEST_ENV_FILE_NAME,
  DEFAULT_SERVICE_ACCOUNT_PATH
} = constants;

const testEnvFileFullPath = path.join(DEFAULT_BASE_PATH, DEFAULT_TEST_ENV_FILE_NAME);
const serviceAccountPath = path.join(DEFAULT_BASE_PATH, DEFAULT_SERVICE_ACCOUNT_PATH);

/**
 * @param  {functions.Event} event - Function event
 * @param {functions.Context} context - Functions context
 * @return {Promise}
 */
function createTestEnvFile() {
  const envPrefix = getEnvPrefix();

  // Get UID from environment (falls back to test/e2e/config.json for local)
  const uid = envVarBasedOnCIEnv('TEST_UID');

  // Throw if UID is missing in environment
  if (!uid) {
    return Promise.reject(new Error(
      `${envPrefix}TEST_UID is missing from environment. Confirm that ${
      constants.DEFAULT_TEST_FOLDER_PATH
      }/config.json contains either ${envPrefix}TEST_UID or TEST_UID.`
    ));
  }

  const FIREBASE_PROJECT_ID = envVarBasedOnCIEnv('FIREBASE_PROJECT_ID');

  console.log(`Generating custom auth token for project: ${chalk.magenta(FIREBASE_PROJECT_ID)}`); // eslint-disable-line no-console

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
    /* eslint-disable no-console */
    console.log(
      chalk.yellow(`Warning: project_id "${serviceAccount.project_id}" does not match env var: "${envVarBasedOnCIEnv('FIREBASE_PROJECT_ID')}"`)
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
    .then((customToken) => {
      /* eslint-disable no-console */
      console.log(
        `Custom token generated successfully, writing to ${chalk.magenta(constants.DEFAULT_TEST_ENV_FILE_NAME)}`
      );
      /* eslint-enable no-console */
      // Remove firebase app
      appFromSA.delete();

      // Create config object to be written into test env file
      const newCypressConfig = {
        TEST_UID: envVarBasedOnCIEnv('TEST_UID'),
        FIREBASE_API_KEY: envVarBasedOnCIEnv('FIREBASE_API_KEY'),
        FIREBASE_PROJECT_ID,
        FIREBASE_AUTH_JWT: customToken
      };
      const stageProjectId = envVarBasedOnCIEnv('STAGE_FIREBASE_PROJECT_ID');
      const stageApiKey = envVarBasedOnCIEnv('STAGE_FIREBASE_API_KEY');

      if (stageProjectId) {
        newCypressConfig.STAGE_FIREBASE_PROJECT_ID = stageProjectId;
        newCypressConfig.STAGE_FIREBASE_API_KEY = stageApiKey;
      }

      // Write config file to cypress.env.json
      fs.writeFileSync(testEnvFileFullPath, JSON.stringify(newCypressConfig, null, 2));

      console.log(`Success! ${chalk.magenta(constants.DEFAULT_TEST_ENV_FILE_NAME)} created successfully`); // eslint-disable-line no-console

      // Create service account file if it does not already exist (for use in reporter)
      if (!fs.existsSync(serviceAccountPath)) {
        // Write service account file as string
        fs.writeFileSync(
          serviceAccountPath,
          JSON.stringify(serviceAccount, null, 2)
        );

        console.log('Service account created successfully'); // eslint-disable-line no-console
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

/**
 * @name createTestEnvFile
 * @description Deploy to Firebase only on build branches (master, stage, prod)
 * @param {String} only - Only flag can be passed to deploy only specified
 * targets (e.g hosting, storage)
 * @example <caption>Basic</caption>
 * # make sure you serviceAccount.json exists
 * cypress-firebase createEnv
 */
module.exports = function (program) {
  program
    .command('createTestEnvFile')
    .description(
      'Build configuration file containing a token for authorizing a firebase instance'
    )
    .action((directory, options) => createTestEnvFile(options)
      .then(() => process.exit(0))
      .catch((err) => {
        console.log(chalk.red(`Error creating test env file:\n${err.message}`)); // eslint-disable-line no-console
        process.exit(1);
        return Promise.reject(err);
      }));
};
