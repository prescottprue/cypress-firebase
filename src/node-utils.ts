/* eslint-disable @typescript-eslint/camelcase */
import { get } from 'lodash';
import path from 'path';
import { existsSync, readFileSync } from 'fs';
import { TEST_CONFIG_FILE_PATH, TEST_ENV_FILE_PATH } from './filePaths';
import {
  DEFAULT_TEST_FOLDER_PATH,
  DEFAULT_CONFIG_FILE_NAME,
} from './constants';

const DEFAULT_BASE_PATH = process.cwd();

/**
 * Get settings from firebaserc file
 * @param filePath - Path for file
 * @returns Firebase settings object
 */
export function readJsonFile(filePath: string): any {
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const fileBuffer = readFileSync(filePath, 'utf8');
    return JSON.parse(fileBuffer.toString());
  } catch (err) {
    /* eslint-disable no-console */
    console.error(
      `cypress-firebase: Unable to parse ${filePath.replace(
        process.cwd(),
        '',
      )} - JSON is most likely not valid`,
    );
    /* eslint-enable no-console */
    return {};
  }
}

/**
 * Get branch name from GITHUB_REF environment variable which is
 * available in Github Actions environment.
 * @returns Branch name if environment variable exists
 */
function branchNameForGithubAction(): string | undefined {
  const { GITHUB_HEAD_REF, GITHUB_REF } = process.env;
  // GITHUB_HEAD_REF for pull requests
  if (GITHUB_HEAD_REF) {
    return GITHUB_HEAD_REF;
  }
  // GITHUB_REF for commits (i.e. refs/heads/master)
  if (GITHUB_REF) {
    return GITHUB_REF.replace('refs/heads/', ''); // remove prefix if it exists
  }
}

/**
 * Get environment slug
 * @returns Environment slug
 */
export function getEnvironmentSlug(): string {
  return (
    branchNameForGithubAction() ||
    process.env.CI_ENVIRONMENT_SLUG || // Gitlab-CI "environment" param
    process.env.CI_COMMIT_REF_SLUG || // Gitlab-CI
    'master'
  );
}

/**
 * Get prefix for current environment based on environment vars available
 * within CI. Falls back to staging (i.e. STAGE)
 * @param envName - Environment option
 * @returns Environment prefix string
 */
export function getEnvPrefix(envName?: string): string {
  const envSlug = envName || getEnvironmentSlug();
  // Replace "-" with "_" to support secrets containing branch names with "-".
  // Needed since Github Actions doesn't support "-" within secrets
  return `${envSlug.toUpperCase().replace(/-/g, '_')}_`;
}

/**
 * Create a variable name string with environment prefix (i.e. STAGE_SERVICE_ACCOUNT)
 * @param varNameRoot - Root of environment variable name
 * @param envName - Environment option
 * @returns Environment var name with prefix
 */
export function withEnvPrefix(varNameRoot: string, envName?: string): string {
  const envPrefix = getEnvPrefix(envName);
  return `${envPrefix}${varNameRoot}`;
}

/**
 * Get path to local service account
 * @param envName - Environment option
 * @returns Path to service account
 */
function getServiceAccountPath(envName?: string): string {
  const withSuffix = path.join(
    DEFAULT_BASE_PATH,
    `serviceAccount-${envName || ''}.json`,
  );
  if (existsSync(withSuffix)) {
    return withSuffix;
  }
  return path.join(DEFAULT_BASE_PATH, 'serviceAccount.json');
}

/**
 * Get cypress folder path from cypress.json config file or fallback to
 * default folder path ('cypress')
 * @returns Path of folder containing cypress folders like "integration"
 */
function getCypressFolderPath(): string {
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
 * @param envName - Environment option
 * @returns Value of the environment variable
 * @example
 * envVarBasedOnCIEnv('FIREBASE_PROJECT_ID')
 * // => 'fireadmin-stage' (value of 'STAGE_FIREBASE_PROJECT_ID' environment var)
 */
export function envVarBasedOnCIEnv(varNameRoot: string, envName?: string): any {
  const combined = withEnvPrefix(varNameRoot, envName);
  const localConfigFilePath = getCypressConfigPath();

  // Config file used for environment (local, containers) from main test path ({integrationFolder}/config.json)
  if (existsSync(localConfigFilePath)) {
    const localConfigObj = readJsonFile(localConfigFilePath);
    const valueFromLocalConfig =
      localConfigObj[combined] || localConfigObj[varNameRoot];
    if (valueFromLocalConfig) {
      return valueFromLocalConfig;
    }
  }

  // Config file used for environment from main cypress environment file (cypress.env.json)
  if (existsSync(TEST_ENV_FILE_PATH)) {
    const configObj = readJsonFile(TEST_ENV_FILE_PATH);
    const valueFromCypressEnv = configObj[combined] || configObj[varNameRoot];
    if (valueFromCypressEnv) {
      return valueFromCypressEnv;
    }
  }

  // CI Environment (environment variables loaded directly)
  return process.env[combined] || process.env[varNameRoot];
}

/**
 * Get parsed value of environment variable. Useful for environment variables
 * which have characters that need to be escaped.
 * @param varNameRoot - variable name without the environment prefix
 * @param envName - Environment option
 * @returns Value of the environment variable
 * @example
 * getParsedEnvVar('FIREBASE_PRIVATE_KEY_ID')
 * // => 'fireadmin-stage' (parsed value of 'STAGE_FIREBASE_PRIVATE_KEY_ID' environment var)
 */
function getParsedEnvVar(varNameRoot: string, envName?: string): any {
  const val = envVarBasedOnCIEnv(varNameRoot, envName);
  const combinedVar = withEnvPrefix(varNameRoot, envName);
  if (!val) {
    /* eslint-disable no-console */
    console.error(
      `cypress-firebase: ${combinedVar} not found, make sure it is set within environment variables.`,
    );
    /* eslint-enable no-console */
  }
  try {
    if (typeof val === 'string') {
      return JSON.parse(val);
    }
    return val;
  } catch (err) {
    console.error(`cypress-firebase: Error parsing ${combinedVar}`); // eslint-disable-line no-console
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
 * @param envSlug - Environment option
 * @returns Service account object
 */
export function getServiceAccount(envSlug?: string): ServiceAccount {
  const serviceAccountPath = getServiceAccountPath(envSlug);
  // Check for local service account file (Local dev)
  if (existsSync(serviceAccountPath)) {
    return readJsonFile(serviceAccountPath); // eslint-disable-line global-require, import/no-dynamic-require
  }

  /* eslint-disable no-console */
  console.log(
    `cypress-firebase: Service account does not exist at path: "${serviceAccountPath.replace(
      `${DEFAULT_BASE_PATH}/`,
      '',
    )}" falling back to environment variables...`,
  );
  /* eslint-enable no-console */

  // Use environment variables (CI)
  const serviceAccountEnvVar = envVarBasedOnCIEnv('SERVICE_ACCOUNT', envSlug);
  if (serviceAccountEnvVar) {
    if (typeof serviceAccountEnvVar === 'string') {
      try {
        return JSON.parse(serviceAccountEnvVar);
      } catch (err) {
        /* eslint-disable no-console */
        console.warn(
          `cypress-firebase: Issue parsing 'SERVICE_ACCOUNT' environment variable from string to object, returning string`,
        );
        /* eslint-enable no-console */
      }
    }
    return serviceAccountEnvVar;
  }

  /* eslint-disable no-console */
  console.info(
    `cypress-firebase: Service account does not exist as a single environment variable within 'SERVICE_ACCOUNT' or ${withEnvPrefix(
      'SERVICE_ACCOUNT',
    )}, checking separate environment variables...`,
  );
  /* eslint-enable no-console */

  const clientId = envVarBasedOnCIEnv('FIREBASE_CLIENT_ID', envSlug);
  if (clientId) {
    /* eslint-disable no-console */
    console.warn(
      "cypress-firebase: 'FIREBASE_CLIENT_ID' will override 'FIREBASE_TOKEN' for auth when calling firebase-tools - this may cause unexepected behavior",
    );
    /* eslint-enable no-console */
  }
  return {
    type: 'service_account',
    project_id: envVarBasedOnCIEnv('FIREBASE_PROJECT_ID', envSlug),
    private_key_id: envVarBasedOnCIEnv('FIREBASE_PRIVATE_KEY_ID', envSlug),
    private_key: getParsedEnvVar('FIREBASE_PRIVATE_KEY', envSlug),
    client_email: envVarBasedOnCIEnv('FIREBASE_CLIENT_EMAIL', envSlug),
    client_id: clientId,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://accounts.google.com/o/oauth2/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: envVarBasedOnCIEnv('FIREBASE_CERT_URL', envSlug),
  };
}

/**
 * Get service account from either local file or environment variables
 * @param envSlug - Environment option
 * @returns Service account object
 */
export function getServiceAccountWithoutWarning(
  envSlug?: string,
): ServiceAccount | null {
  const serviceAccountPath = getServiceAccountPath(envSlug);
  // Check for local service account file (Local dev)
  if (existsSync(serviceAccountPath)) {
    return readJsonFile(serviceAccountPath); // eslint-disable-line global-require, import/no-dynamic-require
  }

  // Use environment variables (CI)
  const serviceAccountEnvVar = envVarBasedOnCIEnv('SERVICE_ACCOUNT', envSlug);
  if (serviceAccountEnvVar) {
    if (typeof serviceAccountEnvVar === 'string') {
      try {
        return JSON.parse(serviceAccountEnvVar);
      } catch (err) {
        /* eslint-disable no-console */
        console.warn(
          `cypress-firebase: Issue parsing 'SERVICE_ACCOUNT' environment variable from string to object, returning string`,
        );
        /* eslint-enable no-console */
      }
    }
    return serviceAccountEnvVar;
  }

  return null;
}
