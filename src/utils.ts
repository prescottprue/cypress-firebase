import { FIREBASE_TOOLS_YES_ARGUMENT } from './constants';

/**
 * Async await wrapper for easy error handling
 * @param promise - Promise to wrap responses of in array
 * @param errorExt - Extension for error
 * @returns Resolves and rejects with an array
 */
export function to<T, U = Error>(
  promise: Promise<T>,
  errorExt?: object,
): Promise<[U | null, T | undefined]> {
  return promise
    .then<[null, T]>((data: T) => [null, data])
    .catch<[U, undefined]>((err: U) => {
      if (errorExt) {
        Object.assign(err, errorExt);
      }

      return [err, undefined];
    });
}

/**
 * Create command arguments string from an array of arguments by joining them
 * with a space including a leading space. If no args provided, empty string
 * is returned
 * @param args - Command arguments to convert into a string
 * @returns Arguments section of command string
 */
export function getArgsString(args: string[] | any): string {
  return args && args.length ? ` ${args.join(' ')}` : '';
}

/**
 * Add default Firebase arguments to arguments array.
 * @param Cypress - Cypress object
 * @param args - arguments array
 * @param [opts={}] - Options object
 * @param opts.token - Firebase CI token to pass as the token argument
 * @param [opts.disableYes=false] - Whether or not to disable the yes argument
 * @returns Default args list
 */
export function addDefaultArgs(
  Cypress: any,
  args: string[],
  opts?: any,
): string[] {
  const { disableYes = false } = opts || {};
  const newArgs = [...args];
  // TODO: Load this in a way that understands environment. Currently this will
  // go to the first project id that is defined, not which one should be used
  // for the specified environment
  const projectId =
    Cypress.env('firebaseProjectId') ||
    Cypress.env('FIREBASE_PROJECT_ID') ||
    Cypress.env('STAGE_FIREBASE_PROJECT_ID');
  // Include project id command so command runs on the current project
  if (projectId && !newArgs.includes('-P') && !newArgs.includes(projectId)) {
    newArgs.push('-P');
    newArgs.push(projectId);
  }
  const tokenFromEnv = Cypress.env('FIREBASE_TOKEN');
  // Include token if it exists in environment
  if (!newArgs.includes('--token') && (opts.token || tokenFromEnv)) {
    newArgs.push('--token');
    newArgs.push(opts.token || tokenFromEnv);
  }
  // Add Firebase's automatic approval argument if it is not already in newArgs
  if (!disableYes && !newArgs.includes(FIREBASE_TOOLS_YES_ARGUMENT)) {
    newArgs.push(FIREBASE_TOOLS_YES_ARGUMENT);
  }
  if (opts.withMeta) {
    // Add -m to argsWithDefaults string (meta) if withmeta option is true
    newArgs.push('-m');
  }
  return newArgs;
}
