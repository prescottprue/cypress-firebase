import { isObject } from 'lodash';
import buildFirestoreCommand, {
  FirestoreAction,
  FirestoreCommandOptions,
  FixtureData, // eslint-disable-line @typescript-eslint/no-unused-vars
} from './buildFirestoreCommand';
import buildRtdbCommand, {
  RTDBAction,
  RTDBCommandOptions,
} from './buildRtdbCommand';

export interface AttachCustomCommandParams {
  Cypress: any;
  cy: any;
  firebase: any;
}

// Add custom commands to the existing Cypress interface
declare global {
  /* eslint-disable @typescript-eslint/no-namespace */
  namespace Cypress {
    /* eslint-enable @typescript-eslint/no-namespace */
    interface Chainable {
      /**
       * Login to Firebase auth using FIREBASE_AUTH_JWT environment variable and TEST_UID
       * environment variables.
       * @see https://github.com/prescottprue/cypress-firebase#cylogin
       * @example
       * cy.login()
       */
      login: (uid?: string) => Chainable;

      /**
       * Log out of Firebase instance
       * @see https://github.com/prescottprue/cypress-firebase#cylogout
       * @example
       * cy.logout()
       */
      logout: () => Chainable;

      /**
       * Call Real Time Database path with some specified action. Authentication is through
       * `FIREBASE_TOKEN` (CI token) since firebase-tools is used under the hood, allowing
       * for admin privileges.
       * @param action - The action type to call with (set, push, update, remove)
       * @param actionPath - Path within RTDB that action should be applied
       * @param opts - Options
       * @param opts.args - Command line args to be passed
       * @see https://github.com/prescottprue/cypress-firebase#cycallrtdb
       * @example <caption>Set Data</caption>
       * const fakeProject = { some: 'data' }
       * cy.callRtdb('set', 'projects/ABC123', fakeProject)
       * @example <caption>Set Data With Meta Data</caption>
       * const fakeProject = { some: 'data' }
       * // Adds createdAt and createdBy (current user's uid) on data
       * cy.callRtdb('set', 'projects/ABC123', fakeProject, { withMeta: true })
       * @example <caption>Passing Other Arguments</caption>
       * const options = { args: ['-d'] }
       * const fakeProject = { some: 'data' }
       * cy.callRtdb('update', 'project/test-project', fakeProject, options)
       */
      callRtdb: (
        action: RTDBAction,
        actionPath: string,
        fixtureDataOrPath?: FixtureData | string,
        opts?: RTDBCommandOptions,
      ) => Chainable;

      /**
       * Call Firestore instance with some specified action. Authentication is through
       * serviceAccount.json since it is at the base
       * level. If using delete, auth is through `FIREBASE_TOKEN` since
       * firebase-tools is used (instead of firebaseExtra).
       * @param action - The action type to call with (set, push, update, remove)
       * @param actionPath - Path within RTDB that action should be applied
       * @param opts - Options
       * @param opts.args - Command line args to be passed
       * @see https://github.com/prescottprue/cypress-firebase#cycallfirestore
       * @example <caption>Set Data</caption>
       * const project = { some: 'data' }
       * cy.callFirestore('set', 'project/test-project', project)
       * @example <caption>Add New Document</caption>
       * const project = { some: 'data' }
       * cy.callFirestore('add', 'projects', project)
       * @example <caption>Basic Get</caption>
       * cy.callFirestore('get', 'projects/test-project').then((project) => {
       *   cy.log('Project:', project)
       * })
       * @example <caption>Recursive Delete</caption>
       * const opts = { recursive: true }
       * cy.callFirestore('delete', 'project/test-project', opts)
       * @example <caption>Manually Loading Fixture</caption>
       * cy.fixture('fakeProject.json').then((project) => {
       *   cy.callFirestore('add', 'projects', project)
       * })
       * @example <caption>Fixture Path</caption>
       * cy.callFirestore('set', 'project/test-project', 'fakeProject.json')
       * @example <caption>Other Args</caption>
       * const opts = { args: ['-r'] }
       * cy.callFirestore('delete', 'project/test-project', opts)
       */
      callFirestore: (
        action: FirestoreAction,
        actionPath: string,
        fixtureDataOrPath?: FixtureData | string,
        opts?: FirestoreCommandOptions,
      ) => Chainable;
    }
  }
}

/**
 * @param firebase - firebase instance
 * @param customToken - Custom token to use for login
 * @returns Promise which resolves with the user auth object
 */
function loginWithCustomToken(
  firebase: any,
  customToken: string,
): Promise<any> {
  return new Promise((resolve, reject): any => {
    firebase.auth().onAuthStateChanged((auth: any) => {
      if (auth) {
        resolve(auth);
      }
    });
    firebase
      .auth()
      .signInWithCustomToken(customToken)
      .catch(reject);
  });
}

/**
 * Attach custom commands including cy.login, cy.logout, cy.callRtdb,
 * @param commandParams - List of params to provide scope during
 * custom command attachment
 */
export default function attachCustomCommands(
  commandParams: AttachCustomCommandParams,
): void {
  const { Cypress, cy, firebase } = commandParams;

  /**
   * Login to Firebase auth using either a passed uid or the FIREBASE_AUTH_JWT
   * environment variable which is generated using firebase-admin authenticated
   * with serviceAccount during call to createTestEnvFile.
   * @name cy.login
   */
  Cypress.Commands.add('login', (uid?: string): any => {
    // Handle UID which is passed in
    if (uid) {
      // Resolve with current user if they already exist
      if (
        firebase.auth().currentUser &&
        uid === firebase.auth().currentUser.uid
      ) {
        cy.log('Authed user already exists, login complete.');
        return undefined;
      }
      // Generate a custom token then login if a UID is passed
      return cy
        .exec(`npx firebase-extra createCustomToken ${uid}`, {
          timeout: 100000,
        })
        .then((out: any) => {
          const { stdout, stderr } = out;
          // Reject with Error if error in firestoreCommand call
          if (stderr) {
            return Promise.reject(new Error(stderr));
          }
          return loginWithCustomToken(firebase, stdout);
        });
    }

    // Throw if JWT not within environment (passed uid case handled above)
    if (!Cypress.env('FIREBASE_AUTH_JWT')) {
      /** Log in using token * */
      const errMsg =
        'uid must be passed to cy.login or FIREBASE_AUTH_JWT must be set to cypress environment in order to login';
      cy.log(errMsg);
      throw new Error(errMsg);
    }

    // Resolve with currentUser if they exist
    if (firebase.auth().currentUser) {
      cy.log('Authed user already exists, login complete.');
      // Undefined is returned to prevent Cypress error:
      // "Cypress detected that you invoked one or more cy commands in a custom command but returned a different value."
      return undefined;
    }

    // Otherwise, login with Token from environment
    return loginWithCustomToken(firebase, Cypress.env('FIREBASE_AUTH_JWT'));
  });

  /**
   * Log out of Firebase instance
   * @name cy.logout
   * @see https://github.com/prescottprue/cypress-firebase#cylogout
   * @example
   * cy.logout()
   */
  Cypress.Commands.add(
    'logout',
    (): Promise<any> => {
      return new Promise((resolve: Function, reject: Function): any => {
        firebase.auth().onAuthStateChanged((auth: any) => {
          if (!auth) {
            resolve();
          }
        });
        firebase
          .auth()
          .signOut()
          .catch(reject);
      });
    },
  );

  /**
   * Call Real Time Database path with some specified action. Authentication is through
   * FIREBASE_TOKEN since firebase-tools is used (instead of firebaseExtra).
   * @param action - The action type to call with (set, push, update, remove)
   * @param actionPath - Path within RTDB that action should be applied
   * @param opts - Options
   * @param opts.args - Command line args to be passed
   * @name cy.callRtdb
   */
  Cypress.Commands.add(
    'callRtdb',
    (
      action: RTDBAction,
      actionPath: string,
      data?: any,
      opts?: RTDBCommandOptions,
    ) => {
      // If data is an object, create a copy to original object is not modified
      const dataToWrite = isObject(data) ? { ...data } : data;

      // Add metadata to dataToWrite if specified by options
      if (isObject(data) && opts && opts.withMeta) {
        dataToWrite.createdBy = Cypress.env('TEST_UID');
        dataToWrite.createdAt = firebase.database.ServerValue.TIMESTAMP;
      }

      // Build command to pass to firebase-tools-extra
      const rtdbCommand = buildRtdbCommand(
        Cypress,
        action,
        actionPath,
        dataToWrite,
        opts,
      );
      cy.log(`Calling RTDB command:\n${rtdbCommand}`);

      // Call firebase-tools-extra command
      return cy.exec(rtdbCommand).then((out: any) => {
        const { stdout, stderr } = out;
        // Reject with Error if error in rtdbCommand call
        if (stderr) {
          cy.log(`Error in Firestore Command:\n${stderr}`);
          return Promise.reject(stderr);
        }

        // Parse result if using get action so that data can be verified
        if (action === 'get' && typeof stdout === 'string') {
          try {
            return JSON.parse(stdout);
          } catch (err) {
            cy.log('Error parsing data from callRtdb response', out);
            return Promise.reject(err);
          }
        }

        // Otherwise return unparsed output
        return stdout;
      });
    },
  );

  /**
   * Call Firestore instance with some specified action. Authentication is through serviceAccount.json since it is at the base
   * level. If using delete, auth is through `FIREBASE_TOKEN` since firebase-tools is used (instead of firebaseExtra).
   * @param action - The action type to call with (set, push, update, remove)
   * @param actionPath - Path within RTDB that action should be applied
   * @param opts - Options
   * @param opts.args - Command line args to be passed
   * @name cy.callFirestore
   */
  Cypress.Commands.add(
    'callFirestore',
    (
      action: FirestoreAction,
      actionPath: string,
      data: any,
      opts: FirestoreCommandOptions = {},
    ): void => {
      // If data is an object, create a copy to original object is not modified
      const dataToWrite = isObject(data) ? { ...data } : data;

      // Add metadata to dataToWrite if specified by options
      if (isObject(data) && opts && opts.withMeta) {
        if (!dataToWrite.createdBy) {
          dataToWrite.createdBy = Cypress.env('TEST_UID');
        }
        if (!dataToWrite.createdAt) {
          dataToWrite.createdAt = new Date().toISOString();
        }
      }

      const firestoreCommand = buildFirestoreCommand(
        Cypress,
        action,
        actionPath,
        dataToWrite,
        opts,
      );

      cy.log(`Calling Firestore command:\n${firestoreCommand}`);

      return cy.exec(firestoreCommand, { timeout: 100000 }).then((out: any) => {
        const { stdout, stderr } = out;
        // Reject with Error if error in firestoreCommand call
        if (stderr) {
          cy.log(`Error in Firestore Command:\n${stderr}`);
          return Promise.reject(stderr);
        }
        // Parse result if using get action so that data can be verified
        if (
          action === 'get' &&
          (typeof stdout === 'string' || stdout instanceof String)
        ) {
          try {
            return JSON.parse(
              stdout instanceof String ? stdout.toString() : stdout,
            );
          } catch (err) {
            cy.log('Error parsing data from callFirestore response', out);
            return Promise.reject(err);
          }
        }

        // Otherwise return unparsed output
        return stdout;
      });
    },
  );
}
