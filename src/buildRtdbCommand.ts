import { isObject, isBoolean } from 'lodash';
import { FixtureData } from './buildFirestoreCommand';
import { addDefaultArgs, getArgsString } from './utils';
import { FIREBASE_TOOLS_BASE_COMMAND, FIREBASE_EXTRA_PATH } from './constants';

/**
 * Action for Real Time Database
 */
export type RTDBAction = 'remove' | 'set' | 'update' | 'delete' | 'get';

/**
 * Options for callRtdb commands
 */
export interface RTDBCommandOptions {
  /**
   * Whether or not to include meta data
   */
  withMeta?: boolean;
  /**
   * Extra arguments
   */
  args?: string[];
  /**
   * CI Token
   */
  token?: string;
  /**
   * Limit to the last <num> results. If true is passed
   * than query is limited to last 1 item.
   */
  limitToLast?: boolean | number;
  /**
   * Limit to the first <num> results. If true is passed
   * than query is limited to last 1 item.
   */
  limitToFirst?: boolean | number;
  /**
   * Select a child key by which to order results
   */
  orderByChild?: string;
  /**
   * Order by key name
   */
  orderByKey?: boolean;
  /**
   * Order by primitive value
   */
  orderByValue?: boolean;
  /**
   * Start results at <val> (based on specified ordering)
   */
  startAt?: any;
  /**
   * End results at <val> (based on specified ordering)
   */
  endAt?: any;
  /**
   * Restrict results to <val> (based on specified ordering)
   */
  equalTo?: any;
  /**
   * Use the database <instance>.firebaseio.com (if omitted, use default database instance)
   */
  instance?: string;
}

const ARGS_MAP = {
  orderByChild: '--order-by',
  orderByKey: '--order-by-key',
  orderByValue: '--order-by-value',
  limitToFirst: '--limit-to-first',
  limitToLast: '--limit-to-last',
  startAt: '--start-at',
  endAt: '--end-at',
  equalTo: '--equal-to',
  instance: '--instance',
};

/**
 * Generate RTDB args from command options
 * @param Cypress - Cypress object
 * @param args - Extra arguments to be passed with command
 * @param [options={}] - Options object
 * @returns A list of args for get command
 */
function generageRtdbGetArgs(
  Cypress: any,
  args: any[],
  options: RTDBCommandOptions,
): string[] {
  const getDataArgsWithDefaults = addDefaultArgs(Cypress, args, {
    disableYes: true,
  });

  if (options.orderByChild && !options.limitToLast && !options.limitToLast) {
    getDataArgsWithDefaults.push(ARGS_MAP.orderByChild);
    getDataArgsWithDefaults.push(options.orderByChild);
  }
  if (options.orderByKey && !options.limitToLast) {
    getDataArgsWithDefaults.push(ARGS_MAP.orderByKey);
  }
  if (options.orderByValue) {
    getDataArgsWithDefaults.push(ARGS_MAP.orderByValue);
  }
  if (options.startAt) {
    getDataArgsWithDefaults.push(ARGS_MAP.startAt);
    getDataArgsWithDefaults.push(options.startAt);
  }
  if (options.endAt) {
    getDataArgsWithDefaults.push(ARGS_MAP.endAt);
    getDataArgsWithDefaults.push(options.endAt);
  }
  if (options.equalTo) {
    getDataArgsWithDefaults.push(ARGS_MAP.equalTo);
    getDataArgsWithDefaults.push(options.equalTo);
  }

  if (options.instance) {
    getDataArgsWithDefaults.push(ARGS_MAP.instance);
    getDataArgsWithDefaults.push(options.instance);
  }

  if (options.limitToLast) {
    const lastCount = isBoolean(options.limitToLast) ? 1 : options.limitToLast;
    if (!options.orderByChild) {
      getDataArgsWithDefaults.push(
        `--order-by-key --limit-to-last ${lastCount}`,
      );
    } else {
      getDataArgsWithDefaults.push(
        `--order-by ${options.orderByChild} --limit-to-last ${lastCount}`,
      );
    }
  }

  if (options.limitToFirst) {
    const lastCount = isBoolean(options.limitToFirst)
      ? 1
      : options.limitToFirst;
    if (!options.orderByChild) {
      getDataArgsWithDefaults.push(
        `--order-by-key --limit-to-first ${lastCount}`,
      );
    } else {
      getDataArgsWithDefaults.push(
        `--order-by ${options.orderByChild} --limit-to-first ${lastCount}`,
      );
    }
  }

  return getDataArgsWithDefaults;
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
  // Call to firebase-tools-extra if using emulator since firebase-tools does not support
  // calling emulator through database commands. See this issue for
  // more detail: https://github.com/firebase/firebase-tools/issues/1957
  const commandPath = Cypress.env('FIREBASE_DATABASE_EMULATOR_HOST')
    ? FIREBASE_EXTRA_PATH
    : FIREBASE_TOOLS_BASE_COMMAND;
  switch (action) {
    case 'remove':
      return `${commandPath} database:${action} ${cleanActionPath}${argsStr}`;
    case 'delete':
      return `${commandPath} database:remove ${cleanActionPath}${argsStr}`;
    case 'get': {
      const getDataArgsWithDefaults = generageRtdbGetArgs(
        Cypress,
        args,
        options,
      );
      const getDataArgsStr = getArgsString(getDataArgsWithDefaults);
      return `${commandPath} database:${action} ${cleanActionPath}${getDataArgsStr}`;
    }
    default: {
      const commandString = `${commandPath} database:${action} ${cleanActionPath}`;
      if (!isObject(fixturePath)) {
        return `${commandString} ${fixturePath}${argsStr}`;
      }
      return `${commandString} -d '${JSON.stringify(fixturePath)}'${argsStr}`;
    }
  }
}
