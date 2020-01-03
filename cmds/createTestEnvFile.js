/**
 * createTestEnvFile commander component
 * To use add require('../cmds/deploy.js')(program) to your commander.js based node executable before program.parse
 */
const logError = require('../lib/logger').error;
const createTestEnvFile = require('../lib/createTestEnvFile').default;

/**
 * @name createTestEnvFile
 * @description Deploy to Firebase only on build branches (master, stage, prod)
 * @param {object} program - Commander program
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
          logError(`Test env file could not be created:\n${err.message}`);
          process.exit(1);
          return Promise.reject(err);
        });
    });
};
