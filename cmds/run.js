/* eslint-disable @typescript-eslint/no-var-requires */
const chalk = require('chalk');
const { runCommand } = require('../lib/node-utils');
const logger = require('../lib/logger');
const createTestEnvFile = require('../lib/createTestEnvFile').default;

/**
 * @name run
 * Build test configuration file then run cypress run command
 * @param {string} program - Commander program
 */
module.exports = function run(program) {
  program
    .command('run [envName]')
    .description('Build test configuration file then run cypress run command')
    .action(envArg => {
      const envName = typeof envArg === 'string' ? envArg : 'local';
      return createTestEnvFile(envName)
        .then(() => {
          logger.info(
            `Starting test run for environment: ${chalk.cyan(envName)}`
          );
          return runCommand({
            command: 'npx',
            args: ['cypress', 'run'].concat(['--env', `envName=${envName}`])
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
