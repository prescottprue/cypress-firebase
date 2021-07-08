declare module "attachCustomCommands" {
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
        statics?: typeof admin.firestore;
    }
    /**
     * Action for Real Time Database
     */
    export type RTDBAction = 'push' | 'remove' | 'set' | 'update' | 'delete' | 'get';
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
        startAt?: number | string | boolean | null | [number | string | boolean | null, string];
        /**
         * Creates a Query with the specified starting point.
         * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#startafter
         */
        startAfter?: number | string | boolean | null | [number | string | boolean | null, string];
        /**
         * End results after <val, key> (based on specified ordering)
         * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#endbefore
         */
        endBefore?: number | string | boolean | null | [number | string | boolean | null, string];
        /**
         * End results at <val> (based on specified ordering)
         * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#endat
         */
        endAt?: number | string | boolean | null | [number | string | boolean | null, string];
        /**
         * Restrict results to <val> (based on specified ordering)
         * @see https://firebase.google.com/docs/reference/js/firebase.database.Query#equalto
         */
        equalTo?: number | string | boolean | null | [number | string | boolean | null, string];
    }
    global {
        namespace Cypress {
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
                callRtdb: (action: RTDBAction, actionPath: string, dataOrOptions?: FixtureData | string | boolean | CallRtdbOptions, options?: CallRtdbOptions) => Chainable;
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
                callFirestore: (action: FirestoreAction, actionPath: string, dataOrOptions?: FixtureData | string | boolean | CallFirestoreOptions, options?: CallFirestoreOptions) => Chainable;
            }
        }
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
    export default function attachCustomCommands(context: AttachCustomCommandParams, options?: CustomCommandOptions): void;
}
declare module "extendWithFirebaseConfig" {
    export interface CypressEnvironmentOptions {
        envName?: string;
        firebaseProjectId?: string;
        [k: string]: any;
    }
    export interface CypressConfig {
        env?: CypressEnvironmentOptions;
        baseUrl?: string;
        [k: string]: any;
    }
    export interface ExtendedCypressConfigEnv {
        [k: string]: any;
        FIREBASE_AUTH_EMULATOR_HOST?: string;
        FIRESTORE_EMULATOR_HOST?: string;
        FIREBASE_DATABASE_EMULATOR_HOST?: string;
        GCLOUD_PROJECT?: string;
    }
    export interface ExtendedCypressConfig {
        [k: string]: any;
        env: ExtendedCypressConfigEnv;
    }
    export interface ExtendWithFirebaseConfigSettings {
        localBaseUrl?: string;
        localHostPort?: string | number;
    }
    /**
     * Load config for Cypress from environment variables. Loads
     * FIREBASE_AUTH_EMULATOR_HOST, FIRESTORE_EMULATOR_HOST,
     * FIREBASE_DATABASE_EMULATOR_HOST, and GCLOUD_PROJECT variable
     * values from environment to pass to Cypress environment
     * @param cypressConfig - Existing Cypress config
     * @returns Cypress config extended with environment variables
     */
    export default function extendWithFirebaseConfig(cypressConfig: CypressConfig): ExtendedCypressConfig;
}
declare module "node-utils" {
    interface ServiceAccount {
        type: string;
        project_id: string;
        private_key_id: string;
        private_key: string;
        client_email: string;
        client_id: string;
        auth_uri: string;
        token_uri: string;
        auth_provider_x509_cert_url: string;
        client_x509_cert_url: string;
    }
    /**
     * Get service account from either environment variables or local file.
     * SERVICE_ACCOUNT environment variables takes precedence
     * NOTE: Loading from default local file path "process.cwd()}/serviceAccount.json"
     * is now deprecated
     * @param envSlug - Environment option
     * @returns Service account object
     */
    export function getServiceAccount(envSlug?: string): ServiceAccount | null;
}
declare module "firebase-utils" {
    import * as admin from 'firebase-admin';
    import { CallFirestoreOptions } from "attachCustomCommands";
    /**
     * Check whether a value is a string or not
     * @param valToCheck - Value to check
     * @returns Whether or not value is a string
     */
    export function isString(valToCheck: any): boolean;
    /**
     * Initialize Firebase instance from service account (from either local
     * serviceAccount.json or environment variables)
     * @returns Initialized Firebase instance
     * @param adminInstance - firebase-admin instance to initialize
     * @param overrideConfig - firebase-admin instance to initialize
     */
    export function initializeFirebase(adminInstance: any, overrideConfig?: admin.AppOptions): admin.app.App;
    /**
     * Check with or not a slash path is the path of a document
     * @param slashPath - Path to check for whether or not it is a doc
     * @returns Whether or not slash path is a document path
     */
    export function isDocPath(slashPath: string): boolean;
    /**
     * Convert slash path to Firestore reference
     * @param firestoreInstance - Instance on which to
     * create ref
     * @param slashPath - Path to convert into firestore refernce
     * @param options - Options object
     * @returns Ref at slash path
     */
    export function slashPathToFirestoreRef(firestoreInstance: any, slashPath: string, options?: CallFirestoreOptions): admin.firestore.CollectionReference | admin.firestore.DocumentReference | admin.firestore.Query;
    /**
     * @param db - Firestore instance
     * @param collectionPath - Path of collection
     * @param batchSize - Size of delete batch
     * @returns Promise which resolves with results of deleting batch
     */
    export function deleteCollection(db: any, collectionPath: string, batchSize?: number): Promise<any>;
}
declare module "tasks" {
    import * as admin from 'firebase-admin';
    import { FixtureData, FirestoreAction, RTDBAction, CallRtdbOptions, CallFirestoreOptions } from "attachCustomCommands";
    /**
     * @param adminInstance - firebase-admin instance
     * @param action - Action to run
     * @param actionPath - Path in RTDB
     * @param options - Query options
     * @param data - Data to pass to action
     * @returns Promise which resolves with results of calling RTDB
     */
    export function callRtdb(adminInstance: any, action: RTDBAction, actionPath: string, options?: CallRtdbOptions, data?: FixtureData | string | boolean): Promise<any>;
    /**
     * @param adminInstance - firebase-admin instance
     * @param action - Action to run
     * @param actionPath - Path to collection or document within Firestore
     * @param options - Query options
     * @param data - Data to pass to action
     * @returns Promise which resolves with results of calling Firestore
     */
    export function callFirestore(adminInstance: admin.app.App, action: FirestoreAction, actionPath: string, options?: CallFirestoreOptions, data?: FixtureData): Promise<any>;
    /**
     * Create a custom token
     * @param adminInstance - Admin SDK instance
     * @param uid - UID of user for which the custom token will be generated
     * @param settings - Settings object
     * @returns Promise which resolves with a custom Firebase Auth token
     */
    export function createCustomToken(adminInstance: any, uid: string, settings?: any): Promise<string>;
    /**
     * Get Firebase Auth user based on UID
     * @param adminInstance - Admin SDK instance
     * @param uid - UID of user for which the custom token will be generated
     * @returns Promise which resolves with a custom Firebase Auth token
     */
    export function getAuthUser(adminInstance: any, uid: string): Promise<admin.auth.UserRecord>;
}
declare module "plugin" {
    import { AppOptions } from 'firebase-admin';
    import { ExtendedCypressConfig } from "extendWithFirebaseConfig";
    /**
     * @param cypressOnFunc - on function from cypress plugins file
     * @param cypressConfig - Cypress config
     * @param adminInstance - firebase-admin instance
     * @param overrideConfig - Override config for firebase instance
     * @returns Extended Cypress config
     */
    export default function pluginWithTasks(cypressOnFunc: any, cypressConfig: any, adminInstance: any, overrideConfig?: AppOptions): ExtendedCypressConfig;
}
declare module "index" {
    import attachCustomCommands from "attachCustomCommands";
    import plugin from "plugin";
    export { attachCustomCommands, plugin };
}
