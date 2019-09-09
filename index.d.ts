declare module "constants" {
    export const DEFAULT_TEST_FOLDER_PATH = "cypress";
    export const DEFAULT_SERVICE_ACCOUNT_PATH = "serviceAccount.json";
    export const DEFAULT_TEST_ENV_FILE_NAME = "cypress.env.json";
    export const DEFAULT_TEST_CONFIG_FILE_NAME = "cypress.json";
    export const DEFAULT_CONFIG_FILE_NAME = "config.json";
    export const FIREBASE_CONFIG_FILE_NAME = ".firebaserc";
    export const FIREBASE_TOOLS_BASE_COMMAND = "$(npm bin)/firebase";
    export const FIREBASE_EXTRA_PATH = "$(npm bin)/firebase-extra";
    export const FIREBASE_TOOLS_YES_ARGUMENT = "-y";
}
declare module "utils" {
    export function to<T, U = Error>(promise: Promise<T>, errorExt?: object): Promise<[U | null, T | undefined]>;
    export function slashPathToFirestoreRef(firestoreInstance: any, slashPath: string, options?: any): any;
    export function getArgsString(args: string[] | any): string;
    export function addDefaultArgs(Cypress: any, args: string[], opts?: any): string[];
    export function isPromise(valToCheck: any): boolean;
    export function shellescape(a: string[]): string;
}
declare module "buildFirestoreCommand" {
    export type FirestoreAction = 'delete' | 'set' | 'update' | 'get';
    export interface FirestoreCommandOptions {
        withMeta?: boolean;
        args?: string[];
        token?: string;
        recursive?: boolean;
    }
    export default function buildFirestoreCommand(Cypress: any, action: FirestoreAction, actionPath: string, fixturePath: FirestoreCommandOptions | string, opts?: FirestoreCommandOptions): string;
}
declare module "buildRtdbCommand" {
    export type RTDBAction = 'remove' | 'set' | 'update' | 'delete' | 'get';
    export interface RTDBCommandOptions {
        withMeta?: boolean;
        args?: string[];
        token?: string;
        limitToLast?: boolean;
        orderByChild?: boolean;
    }
    export default function buildRtdbCommand(Cypress: any, action: RTDBAction, actionPath: string, fixturePath: RTDBCommandOptions | string, opts?: RTDBCommandOptions): string;
}
declare module "attachCustomCommands" {
    import { FirestoreAction, FirestoreCommandOptions } from "buildFirestoreCommand";
    import { RTDBAction, RTDBCommandOptions } from "buildRtdbCommand";
    export interface FixtureData {
        [k: string]: any;
    }
    export interface AttachCustomCommandParams {
        Cypress: any;
        cy: any;
        firebase: any;
    }
    global {
        namespace Cypress {
            interface Chainable {
                login: () => Chainable;
                logout: () => Chainable;
                callRtdb: (action: RTDBAction, actionPath: string, fixtureDataOrPath?: FixtureData | string, opts?: RTDBCommandOptions) => Chainable;
                callFirestore: (action: FirestoreAction, actionPath: string, fixtureDataOrPath?: FixtureData | string, opts?: FirestoreCommandOptions) => Chainable;
            }
        }
    }
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
    export function info(message: string, other?: any): void;
    export function success(message: string, other?: any): void;
    export function warn(message: string, other?: any): void;
    export function error(message: string, other?: any): void;
}
declare module "node-utils" {
    export const DEFAULT_BASE_PATH: string;
    export function readJsonFile(filePath: string): any;
    export function getEnvPrefix(envName?: string): string;
    export function getCypressFolderPath(): string;
    export function getCypressConfigPath(): string;
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
    export function getServiceAccount(envSlug: string): ServiceAccount;
}
declare module "createTestEnvFile" {
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
    export function getFirebaseProjectIdFromConfig(config: CypressConfig): string;
    export default function extendWithFirebaseConfig(cypressConfig: CypressConfig, settings?: ExtendWithFirebaseConfigSettings): ExtendedCypressConfig;
}
declare module "index" {
    import attachCustomCommands from "attachCustomCommands";
    import extendWithFirebaseConfig from "extendWithFirebaseConfig";
    export const plugin: typeof extendWithFirebaseConfig;
    export { attachCustomCommands, extendWithFirebaseConfig };
}
