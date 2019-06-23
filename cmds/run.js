const chalk = require('chalk');
const { runCommand } = require('../lib/utils');
const logger = require('../lib/logger');
const createTestEnvFile = require('../lib/createTestEnvFile').default;

/**
 * @name run
 * @description Build test configuration file then run cypress run command
 * @param {String} envName
 */
module.exports = function run(program) {
  program
    .command('run [envName]')
    .description('Build test configuration file then run cypress run command')
    .action(envArg => {
      return createTestEnvFile(envArg)
        .then(() => {
          logger.info(
            `Starting test run for environment: ${chalk.cyan(envArg)}`
          );
          const defaultArgs = ['cypress', 'run'];
          return runCommand({
            command: 'npx',
            args: envArg
              ? defaultArgs.concat(['--env', `envName=${envArg}`])
              : defaultArgs
          });
        })
        .then(() => process.exit(0))
        .catch(err => {
          logger.error(`Run could not be completed:\n${err.message}`);
          process.exit(1);
          return Promise.reject(err);
        });
    });
};
