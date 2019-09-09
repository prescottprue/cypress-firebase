/* eslint-disable @typescript-eslint/camelcase */
import { get } from 'lodash';
import path from 'path';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { TEST_CONFIG_FILE_PATH, TEST_ENV_FILE_PATH } from './filePaths';
import {
  DEFAULT_TEST_FOLDER_PATH,
  DEFAULT_CONFIG_FILE_NAME,
} from './constants';
import { info, error, warn } from './logger';

export const DEFAULT_BASE_PATH = process.cwd();

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
        .slice(0, -1) // Drop last item (equivalent to dropRight)
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

process.env.FORCE_COLOR = 'true';
