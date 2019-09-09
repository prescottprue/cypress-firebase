/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * run commander component
 * To use add require('../cmds/run.js')(program) to your commander.js based node executable before program.parse
 */

const chalk = require('chalk');
const { runCommand } = require('../lib/utils');
const logger = require('../lib/logger');

/**
 * @name open
 * @description Create test environment config then open Cypress Test Runner
 * @param {String} envName
 */
module.exports = function open(program) {
  program
    .command('open [envName]')
    .description(
      'Build configuration file containing a token for authorizing a firebase instance'
    )
    .action(envArg => {
      const envName = typeof envArg === 'string' ? envArg : 'local';
      return runCommand({
        command: 'cypress-firebase',
        args: ['createTestEnvFile', envName]
      })
        .then(() => {
          logger.info(
            `Opening test runner for environment: ${chalk.cyan(envName)}`
          );
          return runCommand({
            command: 'npx',
            args: ['cypress', 'open', '--env', `envName=${envName}`]
          });
        })
        .then(() => process.exit(0))
        .catch(err => {
          logger.error(
            `Test runner open could not be completed:\n${err.message}`
          );
          process.exit(1);
          return Promise.reject(err);
        });
    });
};
