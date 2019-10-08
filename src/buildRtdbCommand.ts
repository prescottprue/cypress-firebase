import { isObject, isBoolean } from 'lodash';
import { FixtureData } from './buildFirestoreCommand';
import { addDefaultArgs, getArgsString } from './utils';
import { FIREBASE_TOOLS_BASE_COMMAND } from './constants';

export type RTDBAction = 'remove' | 'set' | 'update' | 'delete' | 'get';

export interface RTDBCommandOptions {
  withMeta?: boolean;
  args?: string[];
  token?: string;
  limitToLast?: boolean;
  orderByChild?: boolean;
}

/**
 * Build Command to run Real Time Database action. All commands call
 * firebase-tools directly, so FIREBASE_TOKEN must exist in environment.
 * @param Cypress - Cypress object
 * @param action - action to run on Firstore (i.e. "add", "delete")
 * @param actionPath - Firestore path where action should be run
 * @param fixturePath - Path to fixture. If object is passed,
 * it is used as options.
 * @param [opts={}] - Options object
 * @param opts.args - Extra arguments to be passed with command
 * @returns Command string to be used with cy.exec
 */
export default function buildRtdbCommand(
  Cypress: any,
  action: RTDBAction,
  actionPath: string,
  fixturePath?: FixtureData | RTDBCommandOptions | any,
  opts?: RTDBCommandOptions,
): string {
  const options: RTDBCommandOptions = isObject(fixturePath)
    ? fixturePath
    : opts || {};
  const { args = [] } = options;
  const argsWithDefaults = addDefaultArgs(Cypress, args);
  const argsStr = getArgsString(argsWithDefaults);
  // Add preceding slash if it doesn't already exist (required by firebase-tools)
  const cleanActionPath = actionPath.startsWith('/')
    ? actionPath
    : `/${actionPath}`;
  switch (action) {
    case 'remove':
      return `${FIREBASE_TOOLS_BASE_COMMAND} database:${action} ${cleanActionPath}${argsStr}`;
    case 'delete':
      return `${FIREBASE_TOOLS_BASE_COMMAND} database:remove ${cleanActionPath}${argsStr}`;
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
      return `${FIREBASE_TOOLS_BASE_COMMAND} database:${action} ${cleanActionPath}${getDataArgsStr}`;
    }
    default: {
      const commandString = `${FIREBASE_TOOLS_BASE_COMMAND} database:${action} ${cleanActionPath}`;
      if (!isObject(fixturePath)) {
        return `${commandString} ${fixturePath}${argsStr}`;
      }
      return `${commandString} -d '${JSON.stringify(fixturePath)}'${argsStr}`;
    }
  }
}
