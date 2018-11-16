import { isObject } from 'lodash';
import buildFirestoreCommand from './buildFirestoreCommand';
import buildRtdbCommand from './buildRtdbCommand';

export default function ({ Cypress, cy, firebase }) {
  /**
   * Login to Firebase auth using FIREBASE_AUTH_JWT environment variable
   * which is generated using firebase-admin authenticated with serviceAccount
   * during test:buildConfig phase.
   * @type {Cypress.Command}
   * @memberOf Cypress.Chainable#
   * @name login
   * @example Basic
   * cy.login()
   */
  Cypress.Commands.add('login', () => {
    /** Log in using token * */
    if (!Cypress.env('FIREBASE_AUTH_JWT')) {
      cy.log(
        'FIREBASE_AUTH_JWT must be set to cypress environment in order to login'
      );
      return null;
    }
    if (firebase.auth().currentUser) {
      cy.log('Current user already exists, login complete.');
      return firebase.auth().currentUser;
    }
    return new Promise((resolve, reject) => {
      // eslint-disable-line consistent-return
      firebase.auth().onAuthStateChanged((auth) => {
        if (auth) {
          resolve(auth);
        }
      });
      firebase
        .auth()
        .signInWithCustomToken(Cypress.env('FIREBASE_AUTH_JWT'))
        .catch(reject);
    });
  });

  /**
   * Log out of Firebase instance
   * @memberOf Cypress.Chainable#
   * @name login
   * @function
   */
  Cypress.Commands.add('logout', () => {
    cy.log('Confirming use is logged out...');
    if (!firebase.auth().currentUser) {
      cy.log('Current user already logged out.');
      return null;
    }
    cy.log('Current user exists, logging out...');
    return firebase.auth().signOut();
  });

  /**
   * Call Real Time Database path with some specified action. Authentication is through FIREBASE_TOKEN since firebase-tools
   * @param {String} action - The action type to call with (set, push, update, remove)
   * @param {String} actionPath - Path within RTDB that action should be applied
   * @param {Object} opts - Options
   * @param {Array} opts.args - Command line args to be passed
   * @type {Cypress.Command}
   * @example Set Data
   * const fakeProject = { some: 'data' }
   * cy.callRtdb('set', 'projects/ABC123', fakeProject)
   * @example Set Data With Meta
   * const fakeProject = { some: 'data' }
   * // Adds createdAt and createdBy (current user's uid) on data
   * cy.callRtdb('set', 'projects/ABC123', fakeProject, { withMeta: true })
   * @example Get/Verify Data
   * cy.callRtdb('get', 'projects/ABC123')
   *   .then((project) => {
   *     // Confirm new data has users uid
   *     cy.wrap(project)
   *       .its('createdBy')
   *       .should('equal', Cypress.env('TEST_UID'))
   *   })
   * @example Other Args
   * const opts = { args: ['-d'] }
   * const fakeProject = { some: 'data' }
   * cy.callRtdb('update', 'project/test-project', fakeProject, opts)
   */
  Cypress.Commands.add('callRtdb', (action, actionPath, data, opts = {}) => {
    // If data is an object, create a copy to original object is not modified
    const dataToWrite = isObject(data) ? { ...data } : data;

    // Add metadata to dataToWrite if specified by options
    if (isObject(data) && opts.withMeta) {
      dataToWrite.createdBy = Cypress.env('TEST_UID');
      dataToWrite.createdAt = firebase.database.ServerValue.TIMESTAMP;
    }

    // Build command to pass to firebase-tools-extra
    const rtdbCommand = buildRtdbCommand(
      Cypress,
      action,
      actionPath,
      dataToWrite,
      opts
    );
    cy.log(`Calling RTDB command:\n${rtdbCommand}`);

    // Call firebase-tools-extra command
    return cy.exec(rtdbCommand).then((out) => {
      const { stdout, stderr } = out || {};
      // Reject with Error if error in rtdbCommand call
      if (stderr) {
        cy.log(`Error in Firestore Command:\n${stderr}`);
        return Promise.reject(stderr);
      }

      // Parse result if using get action so that data can be verified
      if (action === 'get' && typeof stdout === 'string') {
        try {
          return JSON.parse(stdout);
        }
        catch (err) {
          cy.log('Error parsing data from callRtdb response', out);
          return Promise.reject(err);
        }
      }

      // Otherwise return unparsed output
      return stdout;
    });
  });

  /**
   * Call Firestore instance with some specified action. Authentication is through serviceAccount.json since it is at the base
   * level. If using delete, auth is through FIREBASE_TOKEN since firebase-tools is used (instead of firebaseExtra).
   * @param {String} action - The action type to call with (set, push, update, remove)
   * @param {String} actionPath - Path within RTDB that action should be applied
   * @param {Object} opts - Options
   * @param {Array} opts.args - Command line args to be passed
   * @type {Cypress.Command}
   * @example Basic
   * cy.callFirestore('add', 'project/test-project', 'fakeProject.json')
   * @example Recursive Delete
   * const opts = { recursive: true }
   * cy.callFirestore('delete', 'project/test-project', opts)
   * @example Other Args
   * const opts = { args: ['-r'] }
   * cy.callFirestore('delete', 'project/test-project', opts)
   */
  Cypress.Commands.add(
    'callFirestore',
    (action, actionPath, data, opts = {}) => {
      // If data is an object, create a copy to original object is not modified
      const dataToWrite = isObject(data) ? { ...data } : data;

      // Add metadata to dataToWrite if specified by options
      if (isObject(data) && opts.withMeta) {
        dataToWrite.createdBy = Cypress.env('TEST_UID');
        dataToWrite.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      }

      const firestoreCommand = buildFirestoreCommand(
        Cypress,
        action,
        actionPath,
        dataToWrite,
        opts
      );
      cy.log(`Calling Firestore command:\n${firestoreCommand}`);

      cy.exec(firestoreCommand, { timeout: 100000 }).then((out) => {
        const { stdout, stderr } = out || {};
        // Reject with Error if error in firestoreCommand call
        if (stderr) {
          cy.log(`Error in Firestore Command:\n${stderr}`);
          return Promise.reject(stderr);
        }

        // Parse result if using get action so that data can be verified
        if (action === 'get' && typeof stdout === 'string') {
          try {
            return JSON.parse(stdout);
          }
          catch (err) {
            cy.log('Error parsing data from callFirestore response', out);
            return Promise.reject(err);
          }
        }

        // Otherwise return unparsed output
        return stdout;
      });
    }
  );
}
