import { isObject, isBoolean } from 'lodash';
import { addDefaultArgs, getArgsString } from './utils';
import { FIREBASE_TOOLS_BASE_COMMAND } from './constants';

/**
 * Build Command to run Real Time Database action. All commands call
 * firebase-tools directly, so FIREBASE_TOKEN must exist in environment.
 * @param  {String} action - action to run on Firstore (i.e. "add", "delete")
 * @param  {String} actionPath - Firestore path where action should be run
 * @param  {String|Object} fixturePath - Path to fixture. If object is passed,
 * it is used as options.
 * @param  {Object} [opts={}] - Options object
 * @param  {Object} opts.args - Extra arguments to be passed with command
 * @return {String} Command string to be used with cy.exec
 */
export default function buildRtdbCommand(
  Cypress,
  action,
  actionPath,
  fixturePath,
  opts = {},
) {
  const options = isObject(fixturePath) ? fixturePath : opts;
  const { args = [] } = options;
  const argsWithDefaults = addDefaultArgs(Cypress, args);
  const argsStr = getArgsString(argsWithDefaults);
  switch (action) {
    case 'delete':
      return `${FIREBASE_TOOLS_BASE_COMMAND} database:${action} ${actionPath}${argsStr}`;
    case 'get': {
      const getDataArgsWithDefaults = addDefaultArgs(Cypress, args, {
        disableYes: true,
      });
      if (options.limitToLast) {
        const lastCount = isBoolean(options.limitToLast)
          ? 1
          : options.limitToLast;
        if (!options.orderByChild) {
          getDataArgsWithDefaults.push(
            `--order-by-key --limit-to-last ${lastCount}`,
          );
        } else {
          getDataArgsWithDefaults.push(
            `--order-by-child ${options.orderByChild} --limit-to-last ${lastCount}`,
          );
        }
      }
      const getDataArgsStr = getArgsString(getDataArgsWithDefaults);
      return `${FIREBASE_TOOLS_BASE_COMMAND} database:${action} /${actionPath}${getDataArgsStr}`;
    }
    default: {
      return `${FIREBASE_TOOLS_BASE_COMMAND} database:${action} /${actionPath} ${fixturePath}${argsStr}`;
    }
  }
}
