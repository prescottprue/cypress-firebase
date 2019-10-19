import { isObject } from 'lodash';
import { addDefaultArgs, getArgsString } from './utils';
import { FIREBASE_TOOLS_BASE_COMMAND, FIREBASE_EXTRA_PATH } from './constants';

/**
 * Action for Firestore
 */
export type FirestoreAction = 'delete' | 'set' | 'update' | 'get';

/**
 * Data from loaded fixture
 */
export interface FixtureData {
  [k: string]: any;
}

/**
 * Options for building Firestore commands
 */
export interface FirestoreCommandOptions {
  /**
   * Whether or not to include createdAt and createdBy
   */
  withMeta?: boolean;
  /**
   * Extra command line arguments to add to command
   */
  args?: string[];
  /**
   * firebase-tools CI token
   */
  token?: string;
  /**
   * Whether or not to run recursive delete of collections
   * and subcollections
   */
  recursive?: boolean;
}

/**
 * Build Command to run Firestore action. Commands call either firebase-extra
 * (in bin/firebaseExtra.js) or firebase-tools directly. FIREBASE_TOKEN must
 * exist in environment if running commands that call firebase-tools.
 * @param Cypress - Cypress object
 * @param action - action to run on Firstore (i.e. "add", "delete")
 * @param actionPath - Firestore path where action should be run
 * @param fixturePathOrData - Path to fixture. If object is passed,
 * it is used as options.
 * @param [opts={}] - Options object
 * @param opts.args - Extra arguments to be passed with command
 * @param opts.token - Firebase CI token to pass as the token argument
 * @returns Command string to be used with cy.exec
 */
export default function buildFirestoreCommand(
  Cypress: any,
  action: FirestoreAction,
  actionPath: string,
  fixturePathOrData?: FixtureData | string | FirestoreCommandOptions,
  opts?: FirestoreCommandOptions,
): string {
  const options: FirestoreCommandOptions =
    isObject(fixturePathOrData) && !opts ? fixturePathOrData : opts || {};
  const { args = [], recursive } = options;
  const argsWithDefaults = addDefaultArgs(Cypress, args, {
    ...options,
    disableYes: true,
  });
  const commandStr = `${FIREBASE_EXTRA_PATH} firestore ${action} ${actionPath}`;
  switch (action) {
    case 'delete': {
      const deleteArgsWithDefaults = addDefaultArgs(Cypress, args, options);
      // Add -r to args string (recursive) if recursive option is true otherwise specify shallow
      const finalDeleteArgs = deleteArgsWithDefaults.concat(
        recursive ? '-r' : '--shallow',
      );
      const deleteArgsStr = getArgsString(finalDeleteArgs);
      return `${FIREBASE_TOOLS_BASE_COMMAND} firestore:${action} ${actionPath}${deleteArgsStr}`;
    }
    case 'get': {
      return `${FIREBASE_EXTRA_PATH} firestore ${action} ${actionPath}`;
    }
    default: {
      const argsStr = getArgsString(argsWithDefaults);
      if (!isObject(fixturePathOrData)) {
        return `${commandStr} ${fixturePathOrData}${argsStr}`;
      }
      return `${commandStr} '${JSON.stringify(fixturePathOrData)}'${argsStr}`;
    }
  }
}
