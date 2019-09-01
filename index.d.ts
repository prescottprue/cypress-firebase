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
    export const DEFAULT_BASE_PATH: string;
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
declare module "utils" {
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
    export function slashPathToFirestoreRef(firestoreInstance: any, slashPath: string, options?: any): any;
    export function getArgsString(args: string[] | any): string;
    export function addDefaultArgs(Cypress: any, args: string[], opts?: any): string[];
    export function isPromise(valToCheck: any): boolean;
    export interface RunCommandOptions {
        beforeMsg: string;
        successMsg: string;
        command: string;
        errorMsg: string;
        args: string[];
        pipeOutput?: boolean;
    }
    export function runCommand(runOptions: RunCommandOptions): Promise<any>;
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
                callRtdb: (action: string, actionPath: string, data?: any, opts?: any) => Chainable;
                callFirestore: (action: string, actionPath: string, data?: any, opts?: any) => Chainable;
            }
        }
    }
    export default function attachCustomCommands(commandParams: AttachCustomCommandParams): void;
}
declare module "createTestEnvFile" {
    export default function createTestEnvFile(envName: string): Promise<string>;
}
declare module "extendWithFirebaseConfig" {
    interface CypressEnvironmentOptions {
        envName?: string;
        firebaseProjectId?: string;
        [k: string]: any;
    }
    interface CypressConfig {
        env?: CypressEnvironmentOptions;
        [k: string]: any;
    }
    export function getFirebaseProjectIdFromConfig(config: CypressConfig): string;
    export default function extendWithFirebaseConfig(cypressConfig: CypressConfig, settings?: {}): any;
}
declare module "index" {
    import attachCustomCommands from "attachCustomCommands";
    import extendWithFirebaseConfig from "extendWithFirebaseConfig";
    export const plugin: typeof extendWithFirebaseConfig;
    export { attachCustomCommands, extendWithFirebaseConfig };
}
