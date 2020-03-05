declare module "constants" {
    export const DEFAULT_TEST_FOLDER_PATH = "cypress";
    export const DEFAULT_SERVICE_ACCOUNT_PATH = "serviceAccount.json";
    export const DEFAULT_TEST_ENV_FILE_NAME = "cypress.env.json";
    export const DEFAULT_TEST_CONFIG_FILE_NAME = "cypress.json";
    export const DEFAULT_CONFIG_FILE_NAME = "config.json";
    export const FIREBASE_CONFIG_FILE_NAME = ".firebaserc";
    export const FIREBASE_TOOLS_BASE_COMMAND = "npx firebase";
    export const FIREBASE_EXTRA_PATH = "npx firebase-extra";
    export const FIREBASE_TOOLS_YES_ARGUMENT = "-y";
}
declare module "utils" {
    /**
     * Async await wrapper for easy error handling
     * @param promise - Promise to wrap responses of in array
     * @param errorExt - Extension for error
     * @returns Resolves and rejects with an array
     */
    export function to<T, U = Error>(promise: Promise<T>, errorExt?: object): Promise<[U | null, T | undefined]>;
    /**
     * Create command arguments string from an array of arguments by joining them
     * with a space including a leading space. If no args provided, empty string
     * is returned
     * @param args - Command arguments to convert into a string
     * @returns Arguments section of command string
     */
    export function getArgsString(args: string[] | any): string;
    /**
     * Add default Firebase arguments to arguments array.
     * @param Cypress - Cypress object
     * @param args - arguments array
     * @param [opts={}] - Options object
     * @param opts.token - Firebase CI token to pass as the token argument
     * @param [opts.disableYes=false] - Whether or not to disable the yes argument
     * @returns Default args list
     */
    export function addDefaultArgs(Cypress: any, args: string[], opts?: any): string[];
}
declare module "buildFirestoreCommand" {
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
        merge?: boolean;
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
    export default function buildFirestoreCommand(Cypress: any, action: FirestoreAction, actionPath: string, fixturePathOrData?: FixtureData | string | FirestoreCommandOptions, opts?: FirestoreCommandOptions): string;
}
declare module "buildRtdbCommand" {
    import { FixtureData } from "buildFirestoreCommand";
    /**
     * Action for Real Time Database
     */
    export type RTDBAction = 'push' | 'remove' | 'set' | 'update' | 'delete' | 'get';
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
    export default function buildRtdbCommand(Cypress: any, action: RTDBAction, actionPath: string, fixturePath?: FixtureData | RTDBCommandOptions | any, opts?: RTDBCommandOptions): string;
}
declare module "attachCustomCommands" {
    import { FirestoreAction, FirestoreCommandOptions, FixtureData } from "buildFirestoreCommand";
    import { RTDBAction, RTDBCommandOptions } from "buildRtdbCommand";
    export interface AttachCustomCommandParams {
        Cypress: any;
        cy: any;
        firebase: any;
    }
    global {
        namespace Cypress {
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
                callRtdb: (action: RTDBAction, actionPath: string, fixtureDataOrPath?: FixtureData | string, opts?: RTDBCommandOptions) => Chainable;
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
                callFirestore: (action: FirestoreAction, actionPath: string, fixtureDataOrPath?: FixtureData | string, opts?: FirestoreCommandOptions) => Chainable;
            }
        }
    }
    /**
     * Attach custom commands including cy.login, cy.logout, cy.callRtdb,
     * @param commandParams - List of params to provide scope during
     * custom command attachment
     */
    export default function attachCustomCommands(commandParams: AttachCustomCommandParams): void;
}
declare module "filePaths" {
    export const FIREBASE_CONFIG_FILE_PATH: string;
    export const TEST_CONFIG_FILE_PATH: string;
    export const TEST_ENV_FILE_PATH: string;
    export const LOCAL_CONFIG_FILE_PATH: string;
}
declare module "logger" {
    export const log: {
        (message?: any, ...optionalParams: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    };
    /**
     * Log info within console
     * @param message - Message containing info to log
     * @param other - Other values to pass to info
     * @returns undefined
     */
    export function info(message: string, other?: any): void;
    /**
     * Log a success within console (colorized with green)
     * @param message - Success message to log
     * @param other - Other values to pass to info
     * @returns undefined
     */
    export function success(message: string, other?: any): void;
    /**
     * Log a warning within the console (colorized with yellow)
     * @param message - Warning message to log
     * @param other - Other values to pass to info
     * @returns undefined
     */
    export function warn(message: string, other?: any): void;
    /**
     * Log an error within console (colorized with red)
     * @param message - Error message to log
     * @param other - Other values to pass to info
     * @returns undefined
     */
    export function error(message: string, other?: any): void;
}
declare module "node-utils" {
    /**
     * Get settings from firebaserc file
     * @param filePath - Path for file
     * @returns Firebase settings object
     */
    export function readJsonFile(filePath: string): any;
    /**
     * Get environment slug
     * @returns Environment slug
     */
    export function getEnvironmentSlug(): string;
    /**
     * Get prefix for current environment based on environment vars available
     * within CI. Falls back to staging (i.e. STAGE)
     * @param envName - Environment option
     * @returns Environment prefix string
     */
    export function getEnvPrefix(envName?: string): string;
    /**
     * Create a variable name string with environment prefix (i.e. STAGE_SERVICE_ACCOUNT)
     * @param varNameRoot - Root of environment variable name
     * @param envName - Environment option
     * @returns Environment var name with prefix
     */
    export function withEnvPrefix(varNameRoot: string, envName?: string): string;
    /**
     * Get path to cypress config file
     * @returns Path to cypress config file
     */
    export function getCypressConfigPath(): string;
    /**
     * Get environment variable based on the current CI environment
     * @param varNameRoot - variable name without the environment prefix
     * @param envName - Environment option
     * @returns Value of the environment variable
     * @example
     * envVarBasedOnCIEnv('FIREBASE_PROJECT_ID')
     * // => 'fireadmin-stage' (value of 'STAGE_FIREBASE_PROJECT_ID' environment var)
     */
    export function envVarBasedOnCIEnv(varNameRoot: string, envName?: string): any;
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
     * Get service account from either local file or environment variables
     * @param envSlug - Environment option
     * @returns Service account object
     */
    export function getServiceAccount(envSlug?: string): ServiceAccount;
    export interface RunCommandOptions {
        command: string;
        args: string[];
        pipeOutput?: boolean;
    }
    /**
     * Run a bash command using spawn pipeing the results to the main process
     * @param runOptions - Options for command run
     * @param runOptions.command - Command to be executed
     * @param runOptions.args - Command arguments
     * @returns Resolves with results of running the command
     * @private
     */
    export function runCommand(runOptions: RunCommandOptions): Promise<any>;
}
declare module "createTestEnvFile" {
    /**
     * Create test environment file (cypress.env.json). Uses admin.auth().createCustomToken
     * from firebase-admin authenticated with a Service Account which is loaded from environment
     * variables or config.json in test folder. Parameters which are added/copied:
     * - `TEST_UID`
     * - `FIREBASE_API_KEY`
     * - `FIREBASE_PROJECT_ID`
     * - `FIREBASE_AUTH_JWT`
     * @param envName - Environment name
     * @returns Promise which resolves with the contents of the test env file
     */
    export default function createTestEnvFile(envName: string): Promise<string>;
}
declare module "extendWithFirebaseConfig" {
    export interface CypressEnvironmentOptions {
        envName?: string;
        firebaseProjectId?: string;
        [k: string]: any;
    }
    export interface CypressConfig {
        env?: CypressEnvironmentOptions;
        baseUrl: string;
        [k: string]: any;
    }
    export interface ExtendedCypressConfig {
        [k: string]: any;
        FIREBASE_PROJECT_ID?: string;
        baseUrl: string;
    }
    export interface ExtendWithFirebaseConfigSettings {
        localBaseUrl?: string;
        localHostPort?: string | number;
    }
    /**
     * Get Firebase project id using Cypress config and config
     * loaded from .firebaserc
     * @param config - Cypress config object
     * @returns Id of firbase project
     */
    export function getFirebaseProjectIdFromConfig(config: CypressConfig): string | undefined;
    /**
     * Load config for Cypress from .firebaserc.
     * @param cypressConfig - Existing Cypress config
     * @param settings - Settings
     * @returns Cypress config extended with FIREBASE_PROJECT_ID and baseUrl
     */
    export default function extendWithFirebaseConfig(cypressConfig: CypressConfig, settings?: ExtendWithFirebaseConfigSettings): ExtendedCypressConfig;
}
declare module "firebase-utils" {
    import * as admin from 'firebase-admin';
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
     * @param adminInstance
     * @param firebaseInstance
     */
    export function initializeFirebase(adminInstance: any): admin.app.App;
    /**
     * Convert slash path to Firestore reference
     * @param firestoreInstance - Instance on which to
     * create ref
     * @param slashPath - Path to convert into firestore refernce
     * @param options - Options object
     * @returns Ref at slash path
     */
    export function slashPathToFirestoreRef(firestoreInstance: any, slashPath: string, options?: any): admin.firestore.CollectionReference | admin.firestore.DocumentReference | admin.firestore.Query;
}
declare module "tasks" {
    import { FixtureData, FirestoreAction, FirestoreCommandOptions } from "buildFirestoreCommand";
    import { RTDBAction, RTDBCommandOptions } from "buildRtdbCommand";
    /**
     * @param adminInstance - firebase-admin instance
     * @param action - Action to run
     * @param actionPath - Path in RTDB
     * @param options
     * @param data
     * @param dataOrOptions - Data or options
     * @returns Promsie which resolves with results of calling RTDB
     */
    export function callRtdb(adminInstance: any, action: RTDBAction, actionPath: string, options?: RTDBCommandOptions, data?: FixtureData): Promise<any>;
    /**
     * @param adminInstance - firebase-admin instance
     * @param action - Action to run
     * @param actionPath - Path to collection or document within Firestore
     * @param options
     * @param data
     * @param dataOrOptions - Data or options
     * @returns Promise which resolves with results of calling Firestore
     */
    export function callFirestore(adminInstance: any, action: FirestoreAction, actionPath: string, options?: FirestoreCommandOptions, data?: FixtureData): Promise<any>;
}
declare module "pluginWithTasks" {
    import { ExtendedCypressConfig } from "extendWithFirebaseConfig";
    /**
     * @param cypressOnFunc - on function from cypress plugins file
     * @param cypressConfig - Cypress config
     * @param adminInstance - firebase-admin instance
     * @returns Extended Cypress config
     */
    export default function pluginWithTasks(cypressOnFunc: Function, cypressConfig: any, adminInstance: any): ExtendedCypressConfig;
}
declare module "index" {
    import attachCustomCommands from "attachCustomCommands";
    import extendWithFirebaseConfig from "extendWithFirebaseConfig";
    import pluginWithTasks from "pluginWithTasks";
    export const plugin: typeof extendWithFirebaseConfig;
    export { attachCustomCommands, extendWithFirebaseConfig, pluginWithTasks };
}
