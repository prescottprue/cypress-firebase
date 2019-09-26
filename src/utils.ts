/* eslint-disable @typescript-eslint/camelcase */
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
 * Convert slash path to Firestore reference
 * @param firestoreInstance - Instance on which to
 * create ref
 * @param slashPath - Path to convert into firestore refernce
 * @param options - Options object
 * @returns Ref at slash path
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
