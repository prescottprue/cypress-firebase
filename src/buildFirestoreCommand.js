import { isObject } from 'lodash';
import { addDefaultArgs, getArgsString } from './utils';
import { FIREBASE_TOOLS_BASE_COMMAND, FIREBASE_EXTRA_PATH } from './constants';

/**
 * Build Command to run Firestore action. Commands call either firebase-extra
 * (in bin/firebaseExtra.js) or firebase-tools directly. FIREBASE_TOKEN must
 * exist in environment if running commands that call firebase-tools.
 * @param  {String} action - action to run on Firstore (i.e. "add", "delete")
 * @param  {String} actionPath - Firestore path where action should be run
 * @param  {String|Object} fixturePath - Path to fixture. If object is passed,
 * it is used as options.
 * @param  {Object} [opts={}] - Options object
 * @param  {Object} opts.args - Extra arguments to be passed with command
 * @return {String} Command string to be used with cy.exec
 */
export default function buildFirestoreCommand(
  Cypress,
  action,
  actionPath,
  fixturePath,
  opts = {},
) {
  const options = isObject(fixturePath) ? fixturePath : opts;
  const { args = [] } = options;
  const argsWithDefaults = addDefaultArgs(Cypress, args, { disableYes: true });
  switch (action) {
    case 'delete': {
      const deleteArgsWithDefaults = addDefaultArgs(Cypress, args);
      // Add -r to args string (recursive) if recursive option is true otherwise specify shallow
      const finalDeleteArgs = deleteArgsWithDefaults.concat(
        options.recursive ? '-r' : '--shallow',
      );
      const deleteArgsStr = getArgsString(finalDeleteArgs);
      return `${FIREBASE_TOOLS_BASE_COMMAND} firestore:${action} ${actionPath}${deleteArgsStr}`;
    }
    case 'set': {
      // Add -m to argsWithDefaults string (meta) if withmeta option is true
      return `${FIREBASE_EXTRA_PATH} firestore ${action} ${actionPath} '${JSON.stringify(
        fixturePath,
      )}'${options.withMeta ? ' -m' : ''}`;
    }
    default: {
      // Add -m to argsWithDefaults string (meta) if withmeta option is true
      if (options.withMeta) {
        argsWithDefaults.push('-m');
      }
      return `${FIREBASE_EXTRA_PATH} firestore ${action} ${actionPath}`;
    }
  }
}
