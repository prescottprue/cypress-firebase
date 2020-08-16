import { existsSync, readFileSync } from 'fs';

/**
 * Read a file from the filesystem and JSON.parse contents
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
function getEnvironmentSlug(): string {
  return (
    branchNameForGithubAction() ||
    process.env.CI_ENVIRONMENT_SLUG || // Gitlab-CI "environment" param
    process.env.CI_COMMIT_REF_SLUG || // Gitlab-CI
    'master'
  );
}

/**
 * Create a variable name string with environment prefix (i.e. STAGE_SERVICE_ACCOUNT)
 * @param varNameRoot - Root of environment variable name
 * @param envName - Environment option
 * @returns Environment var name with prefix
 */
function withEnvPrefix(varNameRoot: string, envName?: string): string {
  const envSlug = envName || getEnvironmentSlug();
  // Replace "-" with "_" to support secrets containing branch names with "-".
  // Needed since Github Actions doesn't support "-" within secrets
  const envPrefix = `${envSlug.toUpperCase().replace(/-/g, '_')}_`;
  return `${envPrefix}${varNameRoot}`;
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
function envVarBasedOnCIEnv(varNameRoot: string, envName?: string): any {
  const combined = withEnvPrefix(varNameRoot, envName);
  const TEST_ENV_FILE_PATH = `${process.cwd()}/cypress.env.json`;

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

/* eslint-disable camelcase */
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
/* eslint-enable camelcase */

/**
 * Get service account from either local file or environment variables
 * @param envSlug - Environment option
 * @returns Service account object
 */
export function getServiceAccount(envSlug?: string): ServiceAccount | null {
  const serviceAccountPath = `${process.cwd()}/serviceAccount.json`;
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
