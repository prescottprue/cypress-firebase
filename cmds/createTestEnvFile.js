/**
 * createTestEnvFile commander component
 * To use add require('../cmds/deploy.js')(program) to your commander.js based node executable before program.parse
 */
const logger = require('../lib/logger');
const createTestEnvFile = require('../lib/createTestEnvFile');

console.log('create test', typeof createTestEnvFile);

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
      return createTestEnvFile(envArg)
        .then(() => process.exit(0))
        .catch(err => {
          logger.error(`Test env file could not be created:\n${err.message}`);
          process.exit(1);
          return Promise.reject(err);
        });
    });
};
