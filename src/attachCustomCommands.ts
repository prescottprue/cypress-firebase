import { isObject } from 'lodash';
import buildFirestoreCommand, {
  FirestoreAction,
  FirestoreCommandOptions,
} from './buildFirestoreCommand';
import buildRtdbCommand, {
  RTDBAction,
  RTDBCommandOptions,
} from './buildRtdbCommand';

export interface FixtureData {
  [k: string]: any;
}

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
       * Login to Firebase auth using FIREBASE_AUTH_JWT environment variable
       * which is generated using firebase-admin authenticated with serviceAccount
       * during test:buildConfig phase.
       */
      login: () => Chainable;

      /**
       * Log out of Firebase instance
       */
      logout: () => Chainable;

      /**
       * Call Real Time Database path with some specified action. Authentication is through
       * FIREBASE_TOKEN since firebase-tools is used (instead of firebaseExtra).
       * @param action - The action type to call with (set, push, update, remove)
       * @param actionPath - Path within RTDB that action should be applied
       * @param opts - Options
       * @param opts.args - Command line args to be passed
       * @example <caption>Set Data</caption>
       * const fakeProject = { some: 'data' }
       * cy.callRtdb('set', 'projects/ABC123', fakeProject)
       * @example <caption>Set Data With Meta</caption>
       * const fakeProject = { some: 'data' }
       * // Adds createdAt and createdBy (current user's uid) on data
       * cy.callRtdb('set', 'projects/ABC123', fakeProject, { withMeta: true })
       * @example <caption>Get/Verify Data</caption>
       * cy.callRtdb('get', 'projects/ABC123')
       *   .then((project) => {
       *     // Confirm new data has users uid
       *     cy.wrap(project)
       *       .its('createdBy')
       *       .should('equal', Cypress.env('TEST_UID'))
       *   })
       * @example <caption>Other Args</caption>
       * const opts = { args: ['-d'] }
       * const fakeProject = { some: 'data' }
       * cy.callRtdb('update', 'project/test-project', fakeProject, opts)
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
       * @example <caption>Basic Set</caption>
       * const project = { some: 'data' }
       * cy.callFirestore('set', 'project/test-project', project)
       * @example <caption>Basic Add</caption>
       * const project = { some: 'data' }
       * cy.callFirestore('add', 'projects', project)
       * @example <caption>Basic Get</caption>
       * cy.callFirestore('get', 'projects/test-project').then((project) => {
       *   cy.log('Project:', project)
       * })
       * @example <caption>Manually Loading Fixture</caption>
       * cy.fixture('fakeProject.json').then((project) => {
       *   cy.callFirestore('add', 'projects', project)
       * })
       * @example <caption>Fixture Path</caption>
       * cy.callFirestore('set', 'project/test-project', 'fakeProject.json')
       * @example <caption>Recursive Delete</caption>
       * const opts = { recursive: true }
       * cy.callFirestore('delete', 'project/test-project', opts)
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
 * Attach custom commands including cy.login, cy.logout, cy.callRtdb,
 * @param commandParams - List of params to provide scope during
 * custom command attachment
 */
export default function attachCustomCommands(
  commandParams: AttachCustomCommandParams,
): void {
  const { Cypress, cy, firebase } = commandParams;

  /**
   * Login to Firebase auth using FIREBASE_AUTH_JWT environment variable
   * which is generated using firebase-admin authenticated with serviceAccount
   * during test:buildConfig phase.
   * @name cy.login
   * @example
   * cy.login()
   */
  Cypress.Commands.add('login', (): any => {
    /** Log in using token * */
    if (!Cypress.env('FIREBASE_AUTH_JWT')) {
      cy.log(
        'FIREBASE_AUTH_JWT must be set to cypress environment in order to login',
      );
    } else if (firebase.auth().currentUser) {
      cy.log('Authed user already exists, login complete.');
    } else {
      return new Promise((resolve, reject): any => {
        firebase.auth().onAuthStateChanged((auth: any) => {
          if (auth) {
            resolve(auth);
          }
        });
        firebase
          .auth()
          .signInWithCustomToken(Cypress.env('FIREBASE_AUTH_JWT'))
          .catch(reject);
      });
    }
  });

  /**
   * Log out of Firebase instance
   * @name cy.logout
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
   * Call Real Time Database path with some specified action. Authentication is through FIREBASE_TOKEN since firebase-tools is used (instead of firebaseExtra).
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
      opts: FirestoreCommandOptions,
    ): void => {
      // If data is an object, create a copy to original object is not modified
      const dataToWrite = isObject(data) ? { ...data } : data;

      // Add metadata to dataToWrite if specified by options
      if (isObject(data) && opts.withMeta) {
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

      cy.exec(firestoreCommand, { timeout: 100000 }).then((out: any) => {
        const { stdout, stderr } = out;
        // Reject with Error if error in firestoreCommand call
        if (stderr) {
          cy.log(`Error in Firestore Command:\n${stderr}`);
          return Promise.reject(stderr);
        }

        // Parse result if using get action so that data can be verified
        if (action === 'get' && typeof stdout === 'string') {
          try {
            return JSON.parse(stdout);
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
