import type { auth, firestore } from 'firebase-admin';
import type { authCreateUser } from './tasks';
import { typedTask, TaskNameToParams } from './tasks';

/**
 * Params for attachCustomCommand function for
 * attaching custom commands.
 */
export interface AttachCustomCommandParams {
  Cypress: any;
  cy: any;
  firebase: any;
  app?: any;
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

export type WhereOptions = [string, FirebaseFirestore.WhereFilterOp, any];

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
  /**
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
  statics?: typeof firestore;
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
   * Limit to the last <num> results.
   * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#limittolast
   */
  limitToLast?: number;
  /**
   * Limit to the first <num> results.
   * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#limittofirst
   */
  limitToFirst?: number;
  /**
   * Select a child key by which to order results
   * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#orderbychild
   */
  orderByChild?: string;
  /**
   * Order by key name
   * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#orderbykey
   */
  orderByKey?: boolean;
  /**
   * Order by primitive value
   * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#orderbyvalue
   */
  orderByValue?: boolean;
  /**
   * Creates a Query with the specified starting point.
   * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#startat
   */
  startAt?:
    | number
    | string
    | boolean
    | null
    | [number | string | boolean | null, string];
  /**
   * Creates a Query with the specified starting point.
   * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#startafter
   */
  startAfter?:
    | number
    | string
    | boolean
    | null
    | [number | string | boolean | null, string];
  /**
   * End results after <val, key> (based on specified ordering)
   * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#endbefore
   */
  endBefore?:
    | number
    | string
    | boolean
    | null
    | [number | string | boolean | null, string];
  /**
   * End results at <val> (based on specified ordering)
   * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#endat
   */
  endAt?:
    | number
    | string
    | boolean
    | null
    | [number | string | boolean | null, string];
  /**
   * Restrict results to <val> (based on specified ordering)
   * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#equalto
   */
  equalTo?:
    | number
    | string
    | boolean
    | null
    | [number | string | boolean | null, string];
}

// Add custom commands to the existing Cypress interface
declare global {
  /* eslint-disable @typescript-eslint/no-namespace */
  namespace Cypress {
    /* eslint-enable @typescript-eslint/no-namespace,@typescript-eslint/no-unused-vars */
    interface Chainable {
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
       * Delete a collection or document from Firestore. Authentication is through serviceAccount.json or SERVICE_ACCOUNT
       * environment variable.
       * @param action This call will perform a deletion
       * @param deletePath The path within Firestore to delete - if it has an odd number of segments, it will delete
       *                     the document, otherwise it will delete the collection
       * @param options Options to be used when calling Firestore
       * @example <caption>Delete a document</caption>
       * cy.callFirestore('delete', 'project/test-project')
       * @example <caption>Delete all documents in a collection</caption>
       * cy.callFirestore('delete', 'project')
       */
      callFirestore(
        action: 'delete',
        deletePath: string,
        options?: CallFirestoreOptions,
      ): Chainable;
      /**
       * Set, or add a document to Firestore. Authentication is through serviceAccount.json or SERVICE_ACCOUNT
       * environment variable.
       * @param action This call will add or set a document
       * @param writePath The path within Firestore where the data should be written
       * @param data The data to be used in the write action
       * @param options Options to be used when calling Firestore
       * @example <caption>Set Data</caption>
       * const project = { some: 'data' }
       * cy.callFirestore('set', 'project/test-project', project)
       * @example <caption>Add New Document</caption>
       * const project = { some: 'data' }
       * cy.callFirestore('add', 'projects', project)
       * @example <caption>Passing A Fixture</caption>
       * cy.fixture('fakeProject.json').then((project) => {
       *   cy.callFirestore('add', 'projects', project)
       * })
       */
      callFirestore<T = firestore.DocumentData>(
        action: 'set' | 'add',
        writePath: string,
        data: firestore.PartialWithFieldValue<T>,
        options?: CallFirestoreOptions,
      ): Chainable;
      /**
       * Update an existing document in Firestore. Authentication is through serviceAccount.json or SERVICE_ACCOUNT
       * environment variable.
       * @param action This call will update an existing document
       * @param writePath The path within Firestore where the existing document is
       * @param data The data to be used in the update action, which is a partial update of the document, with field paths
       * @param options Options to be used when calling Firestore
       */
      callFirestore<T = firestore.DocumentData>(
        action: 'update',
        writePath: string,
        data: firestore.UpdateData<T>,
        options?: CallFirestoreOptions,
      ): Chainable;
      /**
       * Get an existing document from Firestore. Authentication is through serviceAccount.json or SERVICE_ACCOUNT
       * environment variable.
       * @param action This call will get an existing document
       * @param getPath The path within Firestore where the existing document is
       * @param options Options to be used when calling Firestore
       * @see https://github.com/prescottprue/cypress-firebase#cycallfirestore
       * @example <caption>Basic Get</caption>
       * cy.callFirestore('get', 'projects/test-project').then((project) => {
       *   cy.log('Project:', project)
       * })
       */
      callFirestore(
        action: 'get',
        getPath: string,
        options?: CallFirestoreOptions,
      ): Chainable;

      /**
       * Create a Firebase Auth user
       * @param properties - The properties to set on the new user record to be created
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authCreateUser
       * @see https://github.com/prescottprue/cypress-firebase#cyauthcreateuser
       * cy.authCreateUser()
       */
      authCreateUser: (
        properties: auth.CreateRequest,
        tenantId?: string,
      ) => Chainable<auth.UserRecord | null>;

      /**
       * Create a Firebase Auth user with custom claims
       * @param properties - The properties to set on the new user record to be created
       * @param customClaims - Custom claims to attach to the new user
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.createUserWithClaims
       * @see https://github.com/prescottprue/cypress-firebase#cycreateuserwithclaims
       * cy.createUserWithClaims()
       */
      createUserWithClaims: (
        properties: auth.CreateRequest,
        customClaims?: object | null,
        tenantId?: string,
      ) => Chainable<auth.UserRecord | null>;

      /**
       * Import list of Firebase Auth users
       * @param usersImport - The list of user records to import to Firebase Auth
       * @param importOptions - Optional options for the user import
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authImportUsers
       * @see https://github.com/prescottprue/cypress-firebase#cyauthimportusers
       * @example
       * cy.authImportUsers()
       */
      authImportUsers: (
        ...args: TaskNameToParams<'authImportUsers'>
      ) => Chainable<auth.UserImportResult>;

      /**
       * List Firebase Auth users
       * @param maxResults - The page size, 1000 if undefined
       * @param pageToken - The next page token
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authListUsers
       * @see https://github.com/prescottprue/cypress-firebase#cyauthlistusers
       * @example
       * cy.authListUsers()
       */
      authListUsers: (
        ...args: TaskNameToParams<'authListUsers'>
      ) => Cypress.Chainable<auth.ListUsersResult>;

      /**
       * Login to Firebase auth as a user with either a passed uid or the TEST_UID
       * environment variable. A custom auth token is generated using firebase-admin
       * authenticated with serviceAccount.json or SERVICE_ACCOUNT env var.
       * @see https://github.com/prescottprue/cypress-firebase#cylogin
       * @param uid - UID of user to login as
       * @param customClaims - Custom claims to attach to the custom token
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @example <caption>Env Based Login (TEST_UID)</caption>
       * cy.login()
       * @example <caption>Passed UID</caption>
       * cy.login('123SOMEUID')
       */
      login: (uid?: string, customClaims?: any, tenantId?: string) => Chainable;

      /**
       * Login to Firebase auth using email and password user with either a passed
       * email and password or the TEST_EMAIL and TEST_PASSWORD environment variables.
       * Authentication happens with serviceAccount.json or SERVICE_ACCOUNT env var.
       * @see https://github.com/prescottprue/cypress-firebase#cyloginwithemailandpassword
       * @param email - Email of user to login as
       * @param password - Password of user to login as
       * @param customClaims - Custom claims to attach to the custom token
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @example <caption>Env Based Login (TEST_EMAIL, TEST_PASSWORD)</caption>
       * cy.loginWithEmailAndPassword()
       * @example <caption>Passed email and password</caption>
       * cy.login('some@user.com', 'password123')
       */
      loginWithEmailAndPassword: (
        email?: string,
        password?: string,
        customClaims?: any,
        tenantId?: string,
      ) => Chainable;

      /**
       * Log current user out of Firebase Auth
       * @see https://github.com/prescottprue/cypress-firebase#cylogout
       * @example
       * cy.logout()
       */
      logout: () => Chainable;

      /**
       * Get Firebase auth user by UID
       * @param uid - UID of user to get
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authGetUser
       * @see https://github.com/prescottprue/cypress-firebase#cyauthgetuser
       * @example
       * cy.authGetUser('1234')
       */
      authGetUser: (
        ...args: TaskNameToParams<'authGetUser'>
      ) => Chainable<auth.UserRecord | null>;
      /**
       * Get Firebase auth user by email
       * @param email - Email of user to get
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authGetUserByEmail
       * @see https://github.com/prescottprue/cypress-firebase#cyauthgetuserbyemail
       * @example
       * cy.authGetUserByEmail('foobar@mail.com')
       */
      authGetUserByEmail: (
        ...args: TaskNameToParams<'authGetUserByEmail'>
      ) => Chainable<auth.UserRecord | null>;
      /**
       * Get Firebase auth user by phone number
       * @param phoneNumber - Phone number of user to get
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authGetUserByPhoneNumber
       * @see https://github.com/prescottprue/cypress-firebase#cyauthgetuserbyphonenumber
       * @example
       * cy.authGetUserByPhoneNumber('1234567890')
       */
      authGetUserByPhoneNumber: (
        ...args: TaskNameToParams<'authGetUserByPhoneNumber'>
      ) => Chainable<auth.UserRecord | null>;
      /**
       * Get Firebase auth user by providerID and UID
       * @param providerId - Provider ID of user to get
       * @param uid - UID of user to get
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authGetUserByProviderUid
       * @see https://github.com/prescottprue/cypress-firebase#cyauthgetuserbyprovideruid
       * @example
       * cy.authGetUserByProviderUid(providerId, uid)
       */
      authGetUserByProviderUid: (
        ...args: TaskNameToParams<'authGetUserByProviderUid'>
      ) => Chainable<auth.UserRecord | null>;

      /**
       * Get Firebase Auth users based on identifiers
       * @param adminInstance - Admin SDK instance
       * @param identifiers - The identifiers used to indicate which user records should be returned.
       * @param tenantId - Optional ID of tenant used for multi-tenancy
       * @returns Promise which resolves with a GetUsersResult object
       * @see https://github.com/prescottprue/cypress-firebase#cyauthgetusers
       * @example
       * cy.authGetUsers([{email: 'foobar@mail.com'}, {uid: "1234"}])
       */
      authGetUsers: (
        ...args: TaskNameToParams<'authGetUsers'>
      ) => Chainable<auth.GetUsersResult>;

      /**
       * Update an existing Firebase Auth user
       * @param uid - UID of the user to edit
       * @param properties - The properties to update on the user
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authUpdateUser
       * @see https://github.com/prescottprue/cypress-firebase#cyauthupdateuser
       * @example
       * cy.authUpdateUser(uid, {displayName: "New Name"})
       */
      authUpdateUser: (
        ...args: TaskNameToParams<'authUpdateUser'>
      ) => Chainable<auth.UserRecord>;
      /**
       * Set custom claims of an existing Firebase Auth user
       * @param uid - UID of the user to edit
       * @param customClaims - The custom claims to set, null deletes the custom claims
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authSetCustomUserClaims
       * @see https://github.com/prescottprue/cypress-firebase#cyauthsetcustomuserclaims
       * @example
       * cy.authSetCustomUserClaims(uid, {some: 'claim'})
       */
      authSetCustomUserClaims: (
        ...args: TaskNameToParams<'authSetCustomUserClaims'>
      ) => Chainable<null>;

      /**
       * Delete a user from Firebase Auth with either a passed uid or the TEST_UID
       * environment variable
       * @param uid = UID of user to delete
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authDeleteUser
       * @see https://github.com/prescottprue/cypress-firebase#cyauthdeleteuser
       * @example
       * cy.authDeleteUser(uid)
       */
      authDeleteUser: (
        ...args: TaskNameToParams<'authDeleteUser'>
      ) => Chainable<null>;
      /**
       * Delete a user from Firebase Auth with either a passed uid or the TEST_UID
       * environment variable
       * @param uid = UID of user to delete
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authDeleteUsers
       * @see https://github.com/prescottprue/cypress-firebase#cyauthdeleteusers
       * @example
       * cy.authDeleteUsers([uid1, uid2])
       */
      authDeleteUsers: (
        ...args: TaskNameToParams<'authDeleteUsers'>
      ) => Chainable<auth.DeleteUsersResult>;
      /**
       * Delete all users from Firebase Auth
       * Resolves when all users have been deleted
       * Rejects if too many deletes fail or all deletes failed
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.deleteAllAuthUsers
       * @see https://github.com/prescottprue/cypress-firebase#cydeleteallauthusers
       * @example
       * cy.deleteAllAuthUsers()
       */
      deleteAllAuthUsers: (tenantId?: string) => Chainable<void>;

      /**
       * Create a custom token for a user
       * @param uid - UID of the user to create a custom token for
       * @param customClaims - Custom claims to attach to the custom token
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authCreateCustomToken
       * @see https://github.com/prescottprue/cypress-firebase#cyauthcreatecustomtoken
       * @example
       * cy.authCreateCustomToken(uid)
       */
      authCreateCustomToken: (
        ...args: TaskNameToParams<'authCreateCustomToken'>
      ) => Chainable<string>;
      /**
       * Create a session cookie for a user
       * @param idToken - ID token to create session cookie for
       * @param sessionCookieOptions - Options for the session cookie
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authCreateSessionCookie
       * @see https://github.com/prescottprue/cypress-firebase#cyauthcreatesessioncookie
       * @example
       * cy.authCreateSessionCookie(idToken)
       */
      authCreateSessionCookie: (
        ...args: TaskNameToParams<'authCreateSessionCookie'>
      ) => Chainable<string>;
      /**
       * Verify an ID token
       * @param idToken - ID token to verify
       * @param checkRevoked - Whether to check if the token has been revoked
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authVerifyIdToken
       * @see https://github.com/prescottprue/cypress-firebase#cyauthverifyidtoken
       * @example
       * cy.authVerifyIdToken(idToken)
       */
      authVerifyIdToken: (
        ...args: TaskNameToParams<'authVerifyIdToken'>
      ) => Chainable<auth.DecodedIdToken>;
      /**
       * Revoke all refresh tokens for a user
       * @param uid - UID of user to revoke refresh tokens for
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authRevokeRefreshTokens
       * @see https://github.com/prescottprue/cypress-firebase#cyauthrevokerefreshtokens
       * @example
       * cy.authRevokeRefreshTokens(uid)
       */
      authRevokeRefreshTokens: (
        ...args: TaskNameToParams<'authRevokeRefreshTokens'>
      ) => Chainable<void>;
      /**
       * Generate an email verification link
       * @param email - Email to generate verification link for
       * @param actionCodeSettings - Action code settings for the email
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authGenerateEmailVerificationLink
       * @see https://github.com/prescottprue/cypress-firebase#cyauthgenerateemailverificationlink
       * @example
       * cy.authGenerateEmailVerificationLink(email)
       */
      authGenerateEmailVerificationLink: (
        ...args: TaskNameToParams<'authGenerateEmailVerificationLink'>
      ) => Chainable<string>;
      /**
       * Generate a password reset link
       * @param email - Email to generate password reset link for
       * @param actionCodeSettings - Action code settings for the email
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authGeneratePasswordResetLink
       * @see https://github.com/prescottprue/cypress-firebase#cyauthgeneratepasswordresetlink
       * @example
       * cy.authGeneratePasswordResetLink(email)
       */
      authGeneratePasswordResetLink: (
        ...args: TaskNameToParams<'authGeneratePasswordResetLink'>
      ) => Chainable<string>;
      /**
       * Generate a sign in with email link
       * @param email - Email to generate sign in link for
       * @param actionCodeSettings - Action code settings for the email
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authGenerateSignInWithEmailLink
       * @see https://github.com/prescottprue/cypress-firebase#cyauthgeneratesigninwithemaillink
       * @example
       * cy.authGenerateSignInWithEmailLink(email, actionCodeSettings)
       */
      authGenerateSignInWithEmailLink: (
        ...args: TaskNameToParams<'authGenerateSignInWithEmailLink'>
      ) => Chainable<string>;

      /**
       * Generate a verify and change email link
       * @param email - Email to generate verify and change email link for
       * @param newEmail - New email to change to
       * @param actionCodeSettings - Action code settings for the email
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authGenerateVerifyAndChangeEmailLink
       * @see https://github.com/prescottprue/cypress-firebase#cyauthgenerateverifyandchangeemaillink
       * @example
       * cy.authGenerateVerifyAndChangeEmailLink(oldEmail, newEmail)
       */
      authGenerateVerifyAndChangeEmailLink: (
        ...args: TaskNameToParams<'authGenerateVerifyAndChangeEmailLink'>
      ) => Chainable<string>;

      /**
       * Create a provider config
       * @param providerConfig - The provider config to create
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authCreateProviderConfig
       * @see https://github.com/prescottprue/cypress-firebase#cyauthcreateproviderconfig
       * @example
       * cy.authCreateProviderConfig(providerConfig)
       */
      authCreateProviderConfig: (
        ...args: TaskNameToParams<'authCreateProviderConfig'>
      ) => Chainable<auth.AuthProviderConfig>;
      /**
       * Get a provider config
       * @param providerId - The provider ID to get the config for
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authGetProviderConfig
       * @see https://github.com/prescottprue/cypress-firebase#cyauthgetproviderconfig
       * @example
       * cy.authGetProviderConfig(providerId)
       */
      authGetProviderConfig: (
        ...args: TaskNameToParams<'authGetProviderConfig'>
      ) => Chainable<auth.AuthProviderConfig>;
      /**
       * List provider configs
       * @param providerFilter - The provider ID to filter by, or null to list all
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authListProviderConfigs
       * @see https://github.com/prescottprue/cypress-firebase#cyauthlistproviderconfigs
       * @example
       * cy.authListProviderConfigs(providerFilter)
       */
      authListProviderConfigs: (
        ...args: TaskNameToParams<'authListProviderConfigs'>
      ) => Chainable<auth.ListProviderConfigResults>;
      /**
       * Update a provider config
       * @param providerId - The provider ID to update the config for
       * @param providerConfig - The provider config to update to
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authUpdateProviderConfig
       * @see https://github.com/prescottprue/cypress-firebase#cyauthupdateproviderconfig
       * @example
       * cy.authUpdateProviderConfig(providerId, providerConfig)
       */
      authUpdateProviderConfig: (
        ...args: TaskNameToParams<'authUpdateProviderConfig'>
      ) => Chainable<auth.AuthProviderConfig>;
      /**
       * Delete a provider config
       * @param providerId - The provider ID to delete the config for
       * @param tenantId - Optional ID of tenant used for multi-tenancy. Can also
       * be set with environment variable TEST_TENANT_ID
       * @name cy.authDeleteProviderConfig
       * @see https://github.com/prescottprue/cypress-firebase#cyauthdeleteproviderconfig
       * @example
       * cy.authDeleteProviderConfig(providerId)
       */
      authDeleteProviderConfig: (
        ...args: TaskNameToParams<'authDeleteProviderConfig'>
      ) => Chainable<null>;
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
 * @param auth - firebase auth instance
 * @param customToken - Custom token to use for login
 * @returns Promise which resolves with the user auth object
 */
function loginWithCustomToken(auth: any, customToken: string): Promise<any> {
  return new Promise((resolve, reject): any => {
    auth.onAuthStateChanged((auth: any) => {
      if (auth) {
        resolve(auth);
      }
    });
    auth.signInWithCustomToken(customToken).catch(reject);
  });
}

/**
 * @param auth - firebase auth instance
 * @param email - email to use for login
 * @param password - password to use for login
 * @returns Promise which resolves with the user auth object
 */
function loginWithEmailAndPassword(
  auth: any,
  email: string,
  password: string,
): Promise<any> {
  return new Promise((resolve, reject): any => {
    auth.onAuthStateChanged((auth: any) => {
      if (auth) {
        resolve(auth);
      }
    });
    auth.signInWithEmailAndPassword(email, password).catch(reject);
  });
}

/**
 * Delete all users from Firebase Auth, recursively because of batch
 * size limitations
 * Resolves when all users have been deleted
 * Rejects if too many deletes fail or all deletes failed
 * @param cy - Cypress object
 * @param tenantId - Tenant ID to use for user deletion
 * @param pageToken - Page token used for recursion
 * @returns Promise which resolves when all users have been deleted
 */
function authDeleteAllUsers(
  cy: AttachCustomCommandParams['cy'],
  tenantId?: string | undefined,
  pageToken?: string,
): Promise<void> {
  return new Promise<void>((resolve, reject): any => {
    typedTask(cy, 'authListUsers', { tenantId, pageToken }).then(
      ({ users, pageToken: nextPageToken }) => {
        if (users.length === 0) resolve();
        else {
          const uids = users.map((user) => user.uid);
          typedTask(cy, 'authDeleteUsers', { uids, tenantId }).then(
            ({ successCount, failureCount }) => {
              if (failureCount > successCount || successCount === 0)
                reject(
                  new Error(
                    `Too many deletes failed. ${successCount} users were deleted, ${failureCount} failed.`,
                  ),
                );
              authDeleteAllUsers(cy, tenantId, nextPageToken).then(resolve);
            },
          );
        }
      },
    );
  });
}

type CommandNames =
  | 'callRtdb'
  | 'callFirestore'
  | 'authCreateUser'
  | 'createUserWithClaims'
  | 'authImportUsers'
  | 'authListUsers'
  | 'login'
  | 'loginWithEmailAndPassword'
  | 'logout'
  | 'authGetUser'
  | 'authGetUserByEmail'
  | 'authGetUserByPhoneNumber'
  | 'authGetUserByProviderUid'
  | 'authGetUsers'
  | 'authUpdateUser'
  | 'authSetCustomUserClaims'
  | 'authDeleteUser'
  | 'authDeleteUsers'
  | 'deleteAllAuthUsers'
  | 'authCreateCustomToken'
  | 'authCreateSessionCookie'
  | 'authVerifyIdToken'
  | 'authRevokeRefreshTokens'
  | 'authGenerateEmailVerificationLink'
  | 'authGeneratePasswordResetLink'
  | 'authGenerateSignInWithEmailLink'
  | 'authGenerateVerifyAndChangeEmailLink'
  | 'authCreateProviderConfig'
  | 'authGetProviderConfig'
  | 'authListProviderConfigs'
  | 'authUpdateProviderConfig'
  | 'authDeleteProviderConfig';

type CommandNamespacesConfig = {
  [N in CommandNames]?: string | boolean;
};

interface CustomCommandOptions {
  commandNames?: CommandNamespacesConfig;
  tenantId?: string;
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
  const { Cypress, cy, firebase, app } = context;

  const defaultApp = app || firebase.app(); // select default  app

  /**
   * Get firebase auth instance, with tenantId set if provided
   * @param tenantId Optional tenant ID
   * @returns firebase auth instance
   */
  function getAuth(tenantId: string | undefined) {
    const auth = defaultApp.auth();
    if (tenantId) {
      auth.tenantId = tenantId;
    }
    return auth;
  }

  Cypress.Commands.add(
    (options && options.commandNames && options.commandNames.callRtdb) ||
      'callRtdb',
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
        if (dataIsObject && options && options.withMeta) {
          if (!dataToWrite.createdBy && Cypress.env('TEST_UID')) {
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

  Cypress.Commands.add(
    (options && options.commandNames && options.commandNames.callFirestore) ||
      'callFirestore',
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
        if (dataIsObject && options && options.withMeta) {
          if (!dataToWrite.createdBy) {
            dataToWrite.createdBy = Cypress.env('TEST_UID');
          }
          if (!dataToWrite.createdAt) {
            dataToWrite.createdAt = firebase.firestore.Timestamp.now();
          }
        }
        taskSettings.data = dataToWrite;
      }
      // Use third argument as options for get and delete actions
      if (action === 'get' || action === 'delete') {
        taskSettings.options = dataOrOptions;
      } else if (options) {
        // Attach options if they exist
        taskSettings.options = options;
      }
      return cy.task('callFirestore', taskSettings);
    },
  );

  Cypress.Commands.add(
    (options && options.commandNames && options.commandNames.authCreateUser) ||
      'authCreateUser',
    (
      properties: auth.CreateRequest,
      tenantId: string = Cypress.env('TEST_TENANT_ID'),
    ) =>
      typedTask(cy, 'authCreateUser', { properties, tenantId }).then((user) => {
        if (user === 'auth/email-already-exists') {
          if (!properties.email) {
            throw new Error(
              'User with email already exists yet no email was given',
            );
          }
          cy.log('Auth user with given email already exists.');
          return typedTask(cy, 'authGetUserByEmail', {
            email: properties.email,
            tenantId,
          }).then((user) => (user === 'auth/user-not-found' ? null : user));
        }
        if (user === 'auth/phone-number-already-exists') {
          if (!properties.phoneNumber) {
            throw new Error(
              'User with phone number already exists yet no phone number was given',
            );
          }
          cy.log('Auth user with given phone number already exists.');
          return typedTask(cy, 'authGetUserByPhoneNumber', {
            phoneNumber: properties.phoneNumber,
            tenantId,
          }).then((user) => (user === 'auth/user-not-found' ? null : user));
        }
        return user;
      }),
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.createUserWithClaims) ||
      'createUserWithClaims',
    (
      properties: auth.CreateRequest,
      customClaims?: object | null,
      tenantId: string = Cypress.env('TEST_TENANT_ID'),
    ) => {
      typedTask(cy, 'authCreateUser', { properties, tenantId }).then((user) => {
        if (user === 'auth/email-already-exists') {
          if (!properties.email) {
            throw new Error(
              'User with email already exists yet no email was given',
            );
          }
          cy.log('Auth user with given email already exists.');
          return typedTask(cy, 'authGetUserByEmail', {
            email: properties.email,
            tenantId,
          }).then((user) => (user === 'auth/user-not-found' ? null : user));
        }
        if (user === 'auth/phone-number-already-exists') {
          if (!properties.phoneNumber) {
            throw new Error(
              'User with phone number already exists yet no phone number was given',
            );
          }
          cy.log('Auth user with given phone number already exists.');
          return typedTask(cy, 'authGetUserByPhoneNumber', {
            phoneNumber: properties.phoneNumber,
            tenantId,
          }).then((user) => (user === 'auth/user-not-found' ? null : user));
        }
        if (customClaims !== undefined && user) {
          return typedTask(cy, 'authSetCustomUserClaims', {
            uid: user.uid,
            customClaims,
            tenantId,
          }).then(() => user.uid);
        }
        return user;
      });
    },
  );

  Cypress.Commands.add(
    (options && options.commandNames && options.commandNames.authImportUsers) ||
      'authImportUsers',
    (...args: TaskNameToParams<'authImportUsers'>) =>
      typedTask(cy, 'authImportUsers', {
        usersImport: args[0],
        importOptions: args[1],
        tenantId: args[2] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options && options.commandNames && options.commandNames.authListUsers) ||
      'authListUsers',
    (...args: TaskNameToParams<'authListUsers'>) =>
      typedTask(cy, 'authListUsers', {
        maxResults: args[0],
        pageToken: args[1],
        tenantId: args[2] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options && options.commandNames && options.commandNames.login) || 'login',
    (
      uid?: string,
      customClaims?: any,
      tenantId: string | undefined = Cypress.env('TEST_TENANT_ID'),
    ): any => {
      const userUid = uid || Cypress.env('TEST_UID');
      // Handle UID which is passed in
      if (!userUid) {
        throw new Error(
          'uid must be passed or TEST_UID set within environment to login',
        );
      }
      const auth = getAuth(tenantId);
      // Resolve with current user if they already exist
      if (auth.currentUser && userUid === auth.currentUser.uid) {
        cy.log('Authed user already exists, login complete.');
        return undefined;
      }

      cy.log('Creating custom token for login...');

      // Generate a custom token using authCreateCustomToken task (if tasks are enabled) then login
      return typedTask(cy, 'authCreateCustomToken', {
        uid: userUid,
        customClaims,
        tenantId,
      }).then((customToken) => loginWithCustomToken(auth, customToken));
    },
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.loginWithEmailAndPassword) ||
      'loginWithEmailAndPassword',
    (
      email?: string,
      password?: string,
      extraInfo?: Omit<
        Parameters<typeof authCreateUser>[1],
        'email' | 'password'
      >,
      tenantId: string | undefined = Cypress.env('TEST_TENANT_ID'),
    ): any => {
      const userUid = Cypress.env('TEST_UID');
      const userEmail = email || Cypress.env('TEST_EMAIL');
      // Handle email which is passed in
      if (!userEmail) {
        throw new Error(
          'email must be passed or TEST_EMAIL set within environment to login',
        );
      }
      const userPassword = password || Cypress.env('TEST_PASSWORD');
      // Handle password which is passed in
      if (!userPassword) {
        throw new Error(
          'password must be passed or TEST_PASSWORD set within environment to login',
        );
      }
      const auth = getAuth(tenantId);
      // Resolve with current user if they already exist
      if (auth.currentUser && userEmail === auth.currentUser.email) {
        cy.log('Authed user already exists, login complete.');
        return undefined;
      }
      return typedTask(cy, 'authGetUserByEmail', {
        email: userEmail,
        tenantId,
      }).then((user) => {
        if (user)
          return loginWithEmailAndPassword(auth, userEmail, userPassword);
        typedTask(cy, 'authCreateUser', {
          properties: {
            uid: userUid,
            email: userEmail,
            password: userPassword,
            ...extraInfo,
          },
          tenantId,
        });
        return cy
          .task('authCreateUser', {
            properties: {
              email: userEmail,
              password: userPassword,
              ...extraInfo,
            },
            tenantId,
          })
          .then(() => loginWithEmailAndPassword(auth, userEmail, userPassword));
      });
    },
  );

  Cypress.Commands.add(
    (options && options.commandNames && options.commandNames.logout) ||
      'logout',
    (
      tenantId: string | undefined = Cypress.env('TEST_TENANT_ID'),
    ): Promise<any> =>
      new Promise(
        (
          resolve: (value?: any) => void,
          reject: (reason?: any) => void,
        ): any => {
          const auth = getAuth(tenantId);
          auth.onAuthStateChanged((auth: any) => {
            if (!auth) {
              resolve();
            }
          });
          auth.signOut().catch(reject);
        },
      ),
  );

  Cypress.Commands.add(
    (options && options.commandNames && options.commandNames.authGetUser) ||
      'authGetUser',
    (uid?: string, tenantId?: string) => {
      const userUid = uid || Cypress.env('TEST_UID');
      // Handle UID which is passed in
      if (!userUid) {
        throw new Error(
          'uid must be passed or TEST_UID set within environment to login',
        );
      }
      return typedTask(cy, 'authGetUser', {
        uid: userUid,
        tenantId: tenantId || Cypress.env('TEST_TENANT_ID'),
      }).then((user) => {
        if (user === 'auth/user-not-found') return null;
        return user;
      });
    },
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authGetUserByEmail) ||
      'authGetUserByEmail',
    (email?: string, tenantId?: string) => {
      const userEmail = email || Cypress.env('TEST_EMAIL');
      // Handle email which is passed in
      if (!userEmail) {
        throw new Error(
          'email must be passed or TEST_EMAIL set within environment to login',
        );
      }
      return typedTask(cy, 'authGetUserByEmail', {
        email: userEmail,
        tenantId: tenantId || Cypress.env('TEST_TENANT_ID'),
      }).then((user) => {
        if (user === 'auth/user-not-found') return null;
        return user;
      });
    },
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authGetUserByPhoneNumber) ||
      'authGetUserByPhoneNumber',
    (...args: TaskNameToParams<'authGetUserByPhoneNumber'>) =>
      typedTask(cy, 'authGetUserByPhoneNumber', {
        phoneNumber: args[0],
        tenantId: args[1] || Cypress.env('TEST_TENANT_ID'),
      }).then((user) => {
        if (user === 'auth/user-not-found') return null;
        return user;
      }),
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authGetUserByProviderUid) ||
      'authGetUserByProviderUid',
    (providerId: string, uid?: string, tenantId?: string) => {
      const userUid = uid || Cypress.env('TEST_UID');
      // Handle UID which is passed in
      if (!userUid) {
        throw new Error(
          'uid must be passed or TEST_UID set within environment to login',
        );
      }
      typedTask(cy, 'authGetUserByProviderUid', {
        providerId,
        uid: userUid,
        tenantId: tenantId || Cypress.env('TEST_TENANT_ID'),
      }).then((user) => {
        if (user === 'auth/user-not-found') return null;
        return user;
      });
    },
  );

  Cypress.Commands.add(
    (options && options.commandNames && options.commandNames.authGetUsers) ||
      'authGetUsers',
    (...args: TaskNameToParams<'authGetUsers'>) =>
      typedTask(cy, 'authGetUsers', {
        identifiers: args[0],
        tenantId: args[1] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options && options.commandNames && options.commandNames.authUpdateUser) ||
      'authUpdateUser',
    (...args: TaskNameToParams<'authUpdateUser'>) =>
      typedTask(cy, 'authUpdateUser', {
        uid: args[0],
        properties: args[1],
        tenantId: args[2] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authSetCustomUserClaims) ||
      'authSetCustomUserClaims',
    (...args: TaskNameToParams<'authSetCustomUserClaims'>) =>
      typedTask(cy, 'authSetCustomUserClaims', {
        uid: args[0],
        customClaims: args[1],
        tenantId: args[2] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options && options.commandNames && options.commandNames.authDeleteUser) ||
      'authDeleteUser',
    (
      uid?: string,
      tenantId: string | undefined = Cypress.env('TEST_TENANT_ID'),
    ) => {
      const userUid = uid || Cypress.env('TEST_UID');
      // Handle UID which is passed in
      if (!userUid) {
        throw new Error(
          'uid must be passed or TEST_UID set within environment to login',
        );
      }

      return typedTask(cy, 'authDeleteUser', { uid: userUid, tenantId });
    },
  );

  Cypress.Commands.add(
    (options && options.commandNames && options.commandNames.authDeleteUsers) ||
      'authDeleteUsers',
    (...args: TaskNameToParams<'authDeleteUsers'>) =>
      typedTask(cy, 'authDeleteUsers', {
        uids: args[0],
        tenantId: args[1] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.deleteAllAuthUsers) ||
      'deleteAllAuthUsers',
    (tenantId: string | undefined = Cypress.env('TEST_TENANT_ID')) =>
      cy.wrap(authDeleteAllUsers(cy, tenantId)),
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authCreateCustomToken) ||
      'authCreateCustomToken',
    (uid?: string, customClaims?: object, tenantId?: string) => {
      const userUid = uid || Cypress.env('TEST_UID');
      // Handle UID which is passed in
      if (!userUid) {
        throw new Error(
          'uid must be passed or TEST_UID set within environment to login',
        );
      }
      return typedTask(cy, 'authCreateCustomToken', {
        uid: userUid,
        customClaims,
        tenantId: tenantId || Cypress.env('TEST_TENANT_ID'),
      });
    },
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authCreateSessionCookie) ||
      'authCreateSessionCookie',
    (...args: TaskNameToParams<'authCreateSessionCookie'>) =>
      typedTask(cy, 'authCreateSessionCookie', {
        idToken: args[0],
        sessionCookieOptions: args[1],
        tenantId: args[2] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authVerifyIdToken) ||
      'authVerifyIdToken',
    (...args: TaskNameToParams<'authVerifyIdToken'>) =>
      typedTask(cy, 'authVerifyIdToken', {
        idToken: args[0],
        checkRevoked: args[1],
        tenantId: args[2] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authRevokeRefreshTokens) ||
      'authRevokeRefreshTokens',
    (uid?: string, tenantId?: string) => {
      const userUid = uid || Cypress.env('TEST_UID');
      // Handle UID which is passed in
      if (!userUid) {
        throw new Error(
          'uid must be passed or TEST_UID set within environment to login',
        );
      }
      return typedTask(cy, 'authRevokeRefreshTokens', {
        uid: userUid,
        tenantId: tenantId || Cypress.env('TEST_TENANT_ID'),
      });
    },
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authGenerateEmailVerificationLink) ||
      'authGenerateEmailVerificationLink',
    (
      email?: string,
      actionCodeSettings?: auth.ActionCodeSettings,
      tenantId?: string,
    ) => {
      const userEmail = email || Cypress.env('TEST_EMAIL');
      // Handle email which is passed in
      if (!userEmail) {
        throw new Error(
          'email must be passed or TEST_EMAIL set within environment to login',
        );
      }
      return typedTask(cy, 'authGenerateEmailVerificationLink', {
        email: userEmail,
        actionCodeSettings,
        tenantId: tenantId || Cypress.env('TEST_TENANT_ID'),
      });
    },
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authGeneratePasswordResetLink) ||
      'authGeneratePasswordResetLink',
    (
      email?: string,
      actionCodeSettings?: auth.ActionCodeSettings,
      tenantId?: string,
    ) => {
      const userEmail = email || Cypress.env('TEST_EMAIL');
      // Handle email which is passed in
      if (!userEmail) {
        throw new Error(
          'email must be passed or TEST_EMAIL set within environment to login',
        );
      }
      return typedTask(cy, 'authGeneratePasswordResetLink', {
        email: userEmail,
        actionCodeSettings,
        tenantId: tenantId || Cypress.env('TEST_TENANT_ID'),
      });
    },
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authGenerateSignInWithEmailLink) ||
      'authGenerateSignInWithEmailLink',
    (...args: TaskNameToParams<'authGenerateSignInWithEmailLink'>) =>
      typedTask(cy, 'authGenerateSignInWithEmailLink', {
        email: args[0],
        actionCodeSettings: args[1],
        tenantId: args[2] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authGenerateVerifyAndChangeEmailLink) ||
      'authGenerateVerifyAndChangeEmailLink',
    (...args: TaskNameToParams<'authGenerateVerifyAndChangeEmailLink'>) =>
      typedTask(cy, 'authGenerateVerifyAndChangeEmailLink', {
        email: args[0],
        newEmail: args[1],
        actionCodeSettings: args[2],
        tenantId: args[3] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authCreateProviderConfig) ||
      'authCreateProviderConfig',
    (...args: TaskNameToParams<'authCreateProviderConfig'>) =>
      typedTask(cy, 'authCreateProviderConfig', {
        providerConfig: args[0],
        tenantId: args[1] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authGetProviderConfig) ||
      'authGetProviderConfig',
    (...args: TaskNameToParams<'authGetProviderConfig'>) =>
      typedTask(cy, 'authGetProviderConfig', {
        providerId: args[0],
        tenantId: args[1] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authListProviderConfigs) ||
      'authListProviderConfigs',
    (...args: TaskNameToParams<'authListProviderConfigs'>) =>
      typedTask(cy, 'authListProviderConfigs', {
        providerFilter: args[0],
        tenantId: args[1] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authUpdateProviderConfig) ||
      'authUpdateProviderConfig',
    (...args: TaskNameToParams<'authUpdateProviderConfig'>) =>
      typedTask(cy, 'authUpdateProviderConfig', {
        providerId: args[0],
        providerConfig: args[1],
        tenantId: args[2] || Cypress.env('TEST_TENANT_ID'),
      }),
  );

  Cypress.Commands.add(
    (options &&
      options.commandNames &&
      options.commandNames.authDeleteProviderConfig) ||
      'authDeleteProviderConfig',
    (...args: TaskNameToParams<'authDeleteProviderConfig'>) =>
      typedTask(cy, 'authDeleteProviderConfig', {
        providerId: args[0],
        tenantId: args[1] || Cypress.env('TEST_TENANT_ID'),
      }),
  );
}
