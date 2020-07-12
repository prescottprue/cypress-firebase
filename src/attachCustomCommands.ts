import * as admin from 'firebase-admin';

/**
 * Params for attachCustomCommand function for
 * attaching custom commands.
 */
export interface AttachCustomCommandParams {
  Cypress: any;
  cy: any;
  firebase: any;
}

/**
 * Action for Firestore
 */
export type FirestoreAction = 'get' | 'add' | 'set' | 'update' | 'delete';

/**
 * Data from loaded fixture
 */
export interface FixtureData {
  [k: string]: any;
}

type WhereOptions = [string, FirebaseFirestore.WhereFilterOp, any];

/**
 * Options for callFirestore custom Cypress command.
 */
export interface CallFirestoreOptions {
  /**
   * Whether or not to include createdAt and createdBy
   */
  withMeta?: boolean;
  /**
   * Merge during set
   */
  merge?: boolean;
  /*
   * Size of batch to use while deleting
   */
  batchSize?: number;
  /**
   * Filter documents by the specified field and the value should satisfy
   * the relation constraint provided
   */
  where?: WhereOptions | WhereOptions[];
  /**
   * Order documents
   */
  orderBy?: string | [string, FirebaseFirestore.OrderByDirection];
  /**
   * Limit to n number of documents
   */
  limit?: number;
  /**
   * Limit to last n number of documents
   */
  limitToLast?: number;
  /**
   * Firestore statics (i.e. admin.firestore). This should only be needed during
   * testing due to @firebase/testing not containing statics
   */
  statics?: typeof admin.firestore;
}

/**
 * Action for Real Time Database
 */
export type RTDBAction =
  | 'push'
  | 'remove'
  | 'set'
  | 'update'
  | 'delete'
  | 'get';

/**
 * Options for callRtdb commands
 */
export interface CallRtdbOptions {
  /**
   * Whether or not to include meta data
   */
  withMeta?: boolean;
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
}

// Add custom commands to the existing Cypress interface
declare global {
  /* eslint-disable @typescript-eslint/no-namespace */
  namespace Cypress {
    /* eslint-enable @typescript-eslint/no-namespace */
    interface Chainable {
      /**
       * Login to Firebase auth as a user with either a passed uid or the TEST_UID
       * environment variable. A custom auth token is generated using firebase-admin
       * authenticated with serviceAccount.json or SERVICE_ACCOUNT env var.
       * @see https://github.com/prescottprue/cypress-firebase#cylogin
       * @param uid - UID of user to login as
       * @param customClaims - Custom claims to attach to the custom token
       * @example <caption>Env Based Login (TEST_UID)</caption>
       * cy.login()
       * @example <caption>Passed UID</caption>
       * cy.login('123SOMEUID')
       */
      login: (uid?: string, customClaims?: any) => Chainable;

      /**
       * Log current user out of Firebase Auth
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
       * @param dataOrOptions - Data to be used in write action or options to be used for query
       * @param options - Options object
       * @see https://github.com/prescottprue/cypress-firebase#cycallrtdb
       * @example <caption>Set Data</caption>
       * const fakeProject = { some: 'data' }
       * cy.callRtdb('set', 'projects/ABC123', fakeProject)
       * @example <caption>Set Data With Meta Data</caption>
       * const fakeProject = { some: 'data' }
       * // Adds createdAt and createdBy (current user's uid) on data
       * cy.callRtdb('set', 'projects/ABC123', fakeProject, { withMeta: true })
       */
      callRtdb: (
        action: RTDBAction,
        actionPath: string,
        dataOrOptions?: FixtureData | string | boolean | CallRtdbOptions,
        options?: CallRtdbOptions,
      ) => Chainable;

      /**
       * Call Firestore instance with some specified action. Supports get, set, update,
       * add, and delete. Authentication is through serviceAccount.json or SERVICE_ACCOUNT
       * environment variable.
       * @param action - The action type to call with (set, push, update, remove)
       * @param actionPath - Path within RTDB that action should be applied
       * @param dataOrOptions - Data to be used in write action or options to be used for query
       * @param options - Options object
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
       * @example <caption>Passing A Fixture</caption>
       * cy.fixture('fakeProject.json').then((project) => {
       *   cy.callFirestore('add', 'projects', project)
       * })
       */
      callFirestore: (
        action: FirestoreAction,
        actionPath: string,
        dataOrOptions?: FixtureData | string | boolean | CallFirestoreOptions,
        options?: CallFirestoreOptions,
      ) => Chainable;
    }
  }
}

type TypeStr =
  | 'array'
  | 'date'
  | 'object'
  | 'string'
  | 'number'
  | 'bigint'
  | 'boolean'
  | 'symbol'
  | 'undefined'
  | 'function';

/**
 * Get String representing the type for the provided value
 * @param value - Value for which to get type string
 * @returns String representing a type
 */
function getTypeStr(value: any): TypeStr {
  if (Array.isArray(value)) {
    return 'array';
  }
  if (typeof value === 'object' && value instanceof Date) {
    return 'date';
  }
  return typeof value;
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
    firebase.auth().signInWithCustomToken(customToken).catch(reject);
  });
}

interface CommandNamespacesConfig {
  login?: string;
  logout?: string;
  callRtdb?: string;
  callFirestore?: string;
  getAuthUser?: string;
}

interface CustomCommandOptions {
  commandNames?: CommandNamespacesConfig;
}

/**
 * Attach custom commands including cy.login, cy.logout, cy.callRtdb,
 * @param context - Context values passed from Cypress environment
 * custom command attachment
 * @param options - Custom command options
 */
export default function attachCustomCommands(
  context: AttachCustomCommandParams,
  options?: CustomCommandOptions,
): void {
  const { Cypress, cy, firebase } = context;

  /**
   * Login to Firebase auth as a user with either a passed uid or the TEST_UID
   * environment variable. A custom auth token is generated using firebase-admin
   * authenticated with serviceAccount.json or SERVICE_ACCOUNT env var.
   * @name cy.login
   */
  Cypress.Commands.add(
    options?.commandNames?.login || 'login',
    (uid?: string, customClaims?: any): any => {
      const userUid = uid || Cypress.env('TEST_UID');
      // Resolve with current user if they already exist
      if (
        firebase.auth().currentUser &&
        userUid === firebase.auth().currentUser.uid
      ) {
        cy.log('Authed user already exists, login complete.');
        return undefined;
      }

      // Handle UID which is passed in
      if (!userUid) {
        throw new Error(
          'uid must be passed or TEST_UID set within environment to login',
        );
      }

      cy.log('Creating custom token for login...');

      // Generate a custom token using createCustomToken task (if tasks are enabled) then login
      return cy
        .task('createCustomToken', { uid: userUid, customClaims })
        .then((customToken: string) =>
          loginWithCustomToken(firebase, customToken),
        );
    },
  );

  /**
   * Log out of Firebase instance
   * @name cy.logout
   * @see https://github.com/prescottprue/cypress-firebase#cylogout
   * @example
   * cy.logout()
   */
  Cypress.Commands.add(
    options?.commandNames?.logout || 'logout',
    (): Promise<any> => {
      return new Promise((resolve: Function, reject: Function): any => {
        firebase.auth().onAuthStateChanged((auth: any) => {
          if (!auth) {
            resolve();
          }
        });
        firebase.auth().signOut().catch(reject);
      });
    },
  );

  /**
   * Call Real Time Database path with some specified action. Authentication is through
   * FIREBASE_TOKEN since firebase-tools is used (instead of firebaseExtra).
   * @param action - The action type to call with (set, push, update, remove)
   * @param actionPath - Path within RTDB that action should be applied
   * @param options - Options
   * @param options.args - Command line args to be passed
   * @name cy.callRtdb
   */
  Cypress.Commands.add(
    options?.commandNames?.callRtdb || 'callRtdb',
    (
      action: RTDBAction,
      actionPath: string,
      dataOrOptions?: any,
      options?: CallRtdbOptions,
    ) => {
      const taskSettings: any = {
        action,
        path: actionPath,
      };
      // Add data only for write actions
      if (['set', 'update', 'push'].includes(action)) {
        // If exists, create a copy to original object is not modified
        const dataIsObject = getTypeStr(dataOrOptions) === 'object';
        const dataToWrite = dataIsObject ? { ...dataOrOptions } : dataOrOptions;

        // Add metadata to dataToWrite if specified by options
        if (dataIsObject && options?.withMeta) {
          if (!dataToWrite.createdBy) {
            dataToWrite.createdBy = Cypress.env('TEST_UID');
          }
          if (!dataToWrite.createdAt) {
            dataToWrite.createdAt = firebase.database.ServerValue.TIMESTAMP;
          }
        }
        taskSettings.data = dataToWrite;
      }
      // Use third argument as options for get action
      if (action === 'get') {
        taskSettings.options = dataOrOptions;
      } else if (options) {
        // Attach options if they exist
        taskSettings.options = options;
      }
      return cy.task('callRtdb', taskSettings);
    },
  );

  /**
   * Call Firestore instance with some specified action. Authentication is through serviceAccount.json since it is at the base
   * level. If using delete, auth is through `FIREBASE_TOKEN` since firebase-tools is used (instead of firebaseExtra).
   * @param action - The action type to call with (set, push, update, remove)
   * @param actionPath - Path within RTDB that action should be applied
   * @param options - Options
   * @param options.args - Command line args to be passed
   * @name cy.callFirestore
   */
  Cypress.Commands.add(
    options?.commandNames?.callFirestore || 'callFirestore',
    (
      action: FirestoreAction,
      actionPath: string,
      dataOrOptions: any,
      options: CallFirestoreOptions,
    ): void => {
      const taskSettings: any = {
        action,
        path: actionPath,
      };
      // Add data only for write actions
      if (['set', 'update', 'add'].includes(action)) {
        // If data is an object, create a copy to original object is not modified
        const dataIsObject = getTypeStr(dataOrOptions) === 'object';
        const dataToWrite = dataIsObject ? { ...dataOrOptions } : dataOrOptions;

        // Add metadata to dataToWrite if specified by options
        if (dataIsObject && options?.withMeta) {
          if (!dataToWrite.createdBy) {
            dataToWrite.createdBy = Cypress.env('TEST_UID');
          }
          if (!dataToWrite.createdAt) {
            dataToWrite.createdAt = firebase.firestore.Timestamp.now();
          }
        }
        taskSettings.data = dataToWrite;
      }
      // Use third argument as options for get action
      if (action === 'get') {
        taskSettings.options = dataOrOptions;
      } else if (options) {
        // Attach options if they exist
        taskSettings.options = options;
      }
      return cy.task('callFirestore', taskSettings);
    },
  );

  /**
   * Get Firebase auth user by UID
   * @name cy.getAuthUser
   * @see https://github.com/prescottprue/cypress-firebase#cygetauthuser
   * @example
   * cy.getAuthUser()
   */
  Cypress.Commands.add(
    options?.commandNames?.getAuthUser || 'getAuthUser',
    (uid: string): Promise<any> => {
      return cy.task('getAuthUser', uid);
    },
  );
}
