/* eslint-disable @typescript-eslint/camelcase */
import { get } from 'lodash';
import path from 'path';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import stream from 'stream';
import { spawn } from 'child_process';
import { TEST_CONFIG_FILE_PATH, TEST_ENV_FILE_PATH } from './filePaths';
import {
  DEFAULT_BASE_PATH,
  DEFAULT_TEST_FOLDER_PATH,
  FIREBASE_TOOLS_YES_ARGUMENT,
  DEFAULT_CONFIG_FILE_NAME,
} from './constants';
import { info, error, warn } from './logger';

/**
 * Get settings from firebaserc file
 * @returns Firebase settings object
 */
export function readJsonFile(filePath: string): any {
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    error(
      `Unable to parse ${chalk.cyan(
        filePath.replace(DEFAULT_BASE_PATH, ''),
      )} - JSON is most likely not valid`,
    );
    return {};
  }
}

function getEnvironmentSlug(): string {
  return (
    process.env.CI_ENVIRONMENT_SLUG || process.env.CI_COMMIT_REF_SLUG || 'stage'
  );
}

/**
 * Get prefix for current environment based on environment vars available
 * within CI. Falls back to staging (i.e. STAGE)
 * @returns Environment prefix string
 */
export function getEnvPrefix(envName?: string): string {
  const envSlug = envName || getEnvironmentSlug();
  return `${envSlug.toUpperCase()}_`;
}

function getServiceAccountPath(envName?: string): string {
  const withPrefix = path.join(
    DEFAULT_BASE_PATH,
    `serviceAccount-${envName || ''}.json`,
  );
  if (existsSync(withPrefix)) {
    return withPrefix;
  }
  return path.join(DEFAULT_BASE_PATH, 'serviceAccount.json');
}

/**
 * Get cypress folder path from cypress.json config file or fallback to
 * default folder path ('cypress')
 * @returns Path of folder containing cypress folders like "integration"
 */
export function getCypressFolderPath(): string {
  const cypressConfig = readJsonFile(TEST_CONFIG_FILE_PATH); // eslint-disable-line no-use-before-define
  const integrationTestsFolderPath = get(cypressConfig, 'integrationFolder');
  return integrationTestsFolderPath
    ? integrationTestsFolderPath
        .split('/')
        .slice(0, -1)
        .join('/')
    : DEFAULT_TEST_FOLDER_PATH;
}

/**
 * Get path to cypress config file
 * @returns Path to cypress config file
 */
export function getCypressConfigPath(): string {
  const cypressFolderPath = getCypressFolderPath();
  const cypressConfigFilePath = path.join(
    cypressFolderPath,
    DEFAULT_CONFIG_FILE_NAME,
  );
  return cypressConfigFilePath;
}

/**
 * Get environment variable based on the current CI environment
 * @param varNameRoot - variable name without the environment prefix
 * @returns Value of the environment variable
 * @example
 * envVarBasedOnCIEnv('FIREBASE_PROJECT_ID')
 * // => 'fireadmin-stage' (value of 'STAGE_FIREBASE_PROJECT_ID' environment var)
 */
export function envVarBasedOnCIEnv(varNameRoot: string, envName?: string): any {
  const prefix = getEnvPrefix(envName);
  const combined = `${prefix}${varNameRoot}`;
  const localConfigFilePath = getCypressConfigPath();

  // Config file used for environment (local, containers) from main test path ({integrationFolder}/config.json)
  if (existsSync(localConfigFilePath)) {
    const configObj = readJsonFile(localConfigFilePath);
    return configObj[combined] || configObj[varNameRoot];
  }

  // Config file used for environment (local, containers) from main test path (cypress.env.json)
  if (existsSync(TEST_ENV_FILE_PATH)) {
    const configObj = readJsonFile(TEST_ENV_FILE_PATH);
    return configObj[combined] || configObj[varNameRoot];
  }

  // CI Environment (environment variables loaded directly)
  return process.env[combined] || process.env[varNameRoot];
}

/**
 * Get parsed value of environment variable. Useful for environment variables
 * which have characters that need to be escaped.
 * @param varNameRoot - variable name without the environment prefix
 * @returns Value of the environment variable
 * @example
 * getParsedEnvVar('FIREBASE_PRIVATE_KEY_ID')
 * // => 'fireadmin-stage' (parsed value of 'STAGE_FIREBASE_PRIVATE_KEY_ID' environment var)
 */
function getParsedEnvVar(varNameRoot: string): any {
  const val = envVarBasedOnCIEnv(varNameRoot);
  const prefix = getEnvPrefix();
  const combinedVar = `${prefix}${varNameRoot}`;
  if (!val) {
    error(
      `${chalk.cyan(
        combinedVar,
      )} not found, make sure it is set within environment variables.`,
    );
  }
  try {
    if (typeof val === 'string') {
      return JSON.parse(val);
    }
    return val;
  } catch (err) {
    error(`Error parsing ${combinedVar}`);
    return val;
  }
}

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
 * @returns Service account object
 */
export function getServiceAccount(envSlug: string): ServiceAccount {
  const serviceAccountPath = getServiceAccountPath(envSlug);
  // Check for local service account file (Local dev)
  if (existsSync(serviceAccountPath)) {
    return readJsonFile(serviceAccountPath); // eslint-disable-line global-require, import/no-dynamic-require
  }
  info(
    `Service account does not exist at path: "${chalk.cyan(
      serviceAccountPath.replace(`${DEFAULT_BASE_PATH}/`, ''),
    )}" falling back to environment variables...`,
  );
  // Use environment variables (CI)
  const serviceAccountEnvVar = envVarBasedOnCIEnv('SERVICE_ACCOUNT');
  if (serviceAccountEnvVar) {
    if (typeof serviceAccountEnvVar === 'string') {
      try {
        return JSON.parse(serviceAccountEnvVar);
      } catch (err) {
        warn(
          'Issue parsing SERVICE_ACCOUNT environment variable from string to object, returning string',
        );
      }
    }
    return serviceAccountEnvVar;
  }
  const clientId = envVarBasedOnCIEnv('FIREBASE_CLIENT_ID');
  if (clientId) {
    warn(
      '"FIREBASE_CLIENT_ID" will override FIREBASE_TOKEN for auth when calling firebase-tools - this may cause unexepected behavior',
    );
  }
  return {
    type: 'service_account',
    project_id: envVarBasedOnCIEnv('FIREBASE_PROJECT_ID'),
    private_key_id: envVarBasedOnCIEnv('FIREBASE_PRIVATE_KEY_ID'),
    private_key: getParsedEnvVar('FIREBASE_PRIVATE_KEY'),
    client_email: envVarBasedOnCIEnv('FIREBASE_CLIENT_EMAIL'),
    client_id: clientId,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://accounts.google.com/o/oauth2/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: envVarBasedOnCIEnv('FIREBASE_CERT_URL'),
  };
}

/**
 * Convert slash path to Firestore reference
 * @param  {firestore.Firestore} firestoreInstance - Instance on which to
 * create ref
 * @param  {String} slashPath - Path to convert into firestore refernce
 * @return {firestore.CollectionReference|firestore.DocumentReference}
 */
export function slashPathToFirestoreRef(
  firestoreInstance: any,
  slashPath: string,
  options?: any,
): any {
  let ref = firestoreInstance;
  const srcPathArr = slashPath.split('/');
  srcPathArr.forEach(pathSegment => {
    if (ref.collection) {
      ref = ref.collection(pathSegment);
    } else if (ref.doc) {
      ref = ref.doc(pathSegment);
    } else {
      throw new Error(`Invalid slash path: ${slashPath}`);
    }
  });

  // Apply limit to query if it exists
  if (options && options.limit && typeof ref.limit === 'function') {
    ref = ref.limit(options.limit);
  }

  return ref;
}

/**
 * Create command arguments string from an array of arguments by joining them
 * with a space including a leading space. If no args provided, empty string
 * is returned
 * @param args - Command arguments to convert into a string
 * @return Arguments section of command string
 */
export function getArgsString(args: string[] | any): string {
  return args && args.length ? ` ${args.join(' ')}` : '';
}

/**
 * Add default Firebase arguments to arguments array.
 * @param args - arguments array
 * @param [opts={}] - Options object
 * @param opts.token - Firebase CI token to pass as the token argument
 * @param [opts.disableYes=false] - Whether or not to disable the yes argument
 */
export function addDefaultArgs(
  Cypress: any,
  args: string[],
  opts?: any,
): string[] {
  const { disableYes = false, token } = opts;
  const newArgs = [...args];
  // TODO: Load this in a way that understands environment. Currently this will
  // go to the first project id that is defined, not which one should be used
  // for the specified environment
  const projectId =
    Cypress.env('firebaseProjectId') ||
    Cypress.env('FIREBASE_PROJECT_ID') ||
    Cypress.env('STAGE_FIREBASE_PROJECT_ID');
  // Include project id command so command runs on the current project
  if (!newArgs.includes('-P') || !newArgs.includes(projectId)) {
    newArgs.push('-P');
    newArgs.push(projectId);
  }
  const tokenFromEnv = Cypress.env('FIREBASE_TOKEN');
  // Include token if it exists in environment
  if (!newArgs.includes('--token') && (token || tokenFromEnv)) {
    newArgs.push('--token');
    newArgs.push(token || tokenFromEnv);
  }
  // Add Firebase's automatic approval argument if it is not already in newArgs
  if (!disableYes && !newArgs.includes(FIREBASE_TOOLS_YES_ARGUMENT)) {
    newArgs.push(FIREBASE_TOOLS_YES_ARGUMENT);
  }
  return newArgs;
}

process.env.FORCE_COLOR = 'true';

/**
 * Check to see if the provided value is a promise object
 * @param valToCheck - Value to be checked for Promise qualities
 * @returns Whether or not provided value is a promise
 */
export function isPromise(valToCheck: any): boolean {
  return valToCheck && typeof valToCheck.then === 'function';
}

export interface RunCommandOptions {
  command: string;
  args: string[];
  beforeMsg?: string;
  successMsg?: string;
  errorMsg?: string;
  pipeOutput?: boolean;
}

/**
 * Run a bash command using spawn pipeing the results to the main process
 * @param command - Command to be executed
 * @returns Resolves with results of running the command
 * @private
 */
export function runCommand(runOptions: RunCommandOptions): Promise<any> {
  const {
    beforeMsg,
    successMsg,
    command,
    errorMsg,
    args,
    pipeOutput = true,
  } = runOptions;
  if (beforeMsg) info(beforeMsg);
  return new Promise((resolve, reject): void => {
    const child = spawn(command, args);
    let output: any;
    let error: any;
    const customStream = new stream.Writable();
    const customErrorStream = new stream.Writable();
    /* eslint-disable no-underscore-dangle */
    customStream._write = (data, ...argv): void => {
      output += data;
      if (pipeOutput) {
        process.stdout._write(data, ...argv);
      }
    };
    customErrorStream._write = (data, ...argv): void => {
      error += data;
      if (pipeOutput) {
        process.stderr._write(data, ...argv);
      }
    };
    /* eslint-enable no-underscore-dangle */
    // Pipe errors and console output to main process
    child.stdout.pipe(customStream);
    child.stderr.pipe(customErrorStream);
    // When child exits resolve or reject based on code
    child.on('exit', (code: number): void => {
      if (code !== 0) {
        // Resolve for npm warnings
        if (output && output.indexOf('npm WARN') !== -1) {
          return resolve(successMsg || output);
        }
        if (errorMsg) {
          console.log(errorMsg); // eslint-disable-line no-console
        }
        reject(error || output);
      } else {
        // resolve(null, stdout)
        if (successMsg) info(successMsg);
        // Remove leading undefined from response
        if (output && output.indexOf('undefined') === 0) {
          resolve(successMsg || output.replace('undefined', ''));
        } else {
          console.log('output: ', output); // eslint-disable-line no-console
          resolve(successMsg || output);
        }
      }
    });
  });
}

/**
 * Escape shell command arguments and join them to a single string
 * @param a - List of arguments to escape
 * @returns Command string with arguments escaped
 */
export function shellescape(a: string[]): string {
  const ret: string[] = [];

  a.forEach(s => {
    if (/[^A-Za-z0-9_/:=-]/.test(s)) {
      // eslint-disable-line no-useless-escape
      s = `'${s.replace(/'/g, "'\\''")}'`; // eslint-disable-line no-param-reassign
      s = s // eslint-disable-line no-param-reassign
        .replace(/^(?:'')+/g, '') // unduplicate single-quote at the beginning
        .replace(/\\'''/g, "\\'"); // remove non-escaped single-quote if there are enclosed between 2 escaped
    }
    ret.push(s);
  });

  return ret.join(' ');
}
