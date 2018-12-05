/**
 * run commander component
 * To use add require('../cmds/run.js')(program) to your commander.js based node executable before program.parse
 */

const chalk = require('chalk');
const { runCommand } = require('../lib/utils');
const logger = require('../lib/logger');

/**
 * @name run
 * @description Deploy to Firebase only on build branches (master, stage, prod)
 * @param {String} envName
 */
module.exports = function run(program) {
  program
    .command('run [envName]')
    .description(
      'Build configuration file containing a token for authorizing a firebase instance'
    )
    .action((envArg) => {
      const envName = typeof envArg === 'string' ? envArg : 'local';
      return runCommand({ command: `cypress-firebase createTestEnvFile ${envName}` })
        .then(() => {
          logger.info(`Starting test run for environment: ${chalk.cyan(envName)}`);
          return runCommand({ command: 'npx', args: ['cypress', 'run', '--env', `envName=${envName}`] });
        })
        .then(() => process.exit(0))
        .catch((err) => {
          logger.error(`Run could not be completed:\n${err.message}`);
          process.exit(1);
          return Promise.reject(err);
        });
    });
};
