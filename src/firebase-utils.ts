import * as admin from 'firebase-admin';
import { get } from 'lodash';
import { getServiceAccount } from './node-utils';

/**
 * Check whether a value is a string or not
 * @param valToCheck - Value to check
 * @returns Whether or not value is a string
 */
export function isString(valToCheck: any): boolean {
  return typeof valToCheck === 'string' || valToCheck instanceof String;
}

/**
 * Get projectId for emulated project. Attempts to load from
 * FIREBASE_PROJECT or FIREBASE_PROJECT_ID from environment variables
 * within node environment or from the cypress environment. If not
 * found within environment, falls back to serviceAccount.json file
 * then defaults to "test".
 * @returns projectId for emulated project
 */
function getEmulatedProjectId(): string {
  // Get service account from local file falling back to environment variables
  const serviceAccount = getServiceAccount();
  const projectIdFromSA = get(serviceAccount, 'project_id');
  return projectIdFromSA || 'test';
}

/**
 * Get settings for Firestore from environment. Loads port and servicePath from
 * FIRESTORE_EMULATOR_HOST node environment variable if found, otherwise
 * defaults to port 8080 and servicePath "localhost".
 * @returns Firestore settings to be passed to firebase.firestore().settings
 */
function firestoreSettingsFromEnv(): FirebaseFirestore.Settings {
  const { FIRESTORE_EMULATOR_HOST } = process.env;
  if (
    typeof FIRESTORE_EMULATOR_HOST === 'undefined' ||
    !isString(FIRESTORE_EMULATOR_HOST)
  ) {
    return {
      servicePath: 'localhost',
      port: 8080,
    };
  }
  const [servicePath, portStr] = FIRESTORE_EMULATOR_HOST.split(':');
  return {
    servicePath,
    port: parseInt(portStr, 10),
  };
}

let fbInstance: any;

/**
 * Initialize Firebase instance from service account (from either local
 * serviceAccount.json or environment variables)
 * @returns Initialized Firebase instance
 * @param adminInstance
 * @param firebaseInstance
 */
export function initializeFirebase(adminInstance: any): any {
  if (fbInstance) {
    return fbInstance;
  }
  try {
    // Use emulator if it exists in environment
    if (
      process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_DATABASE_EMULATOR_HOST
    ) {
      // TODO: Look into using @firebase/testing in place of admin here to allow for
      // usage of clearFirestoreData (see https://github.com/prescottprue/cypress-firebase/issues/73 for more info)
      const projectId = getEmulatedProjectId();

      const fbConfig: any = { projectId };
      // Initialize RTDB with databaseURL from FIREBASE_DATABASE_EMULATOR_HOST to allow for RTDB actions
      // within Emulator
      if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
        const [, portStr] = process.env.FIREBASE_DATABASE_EMULATOR_HOST.split(
          ':',
        );
        fbConfig.databaseURL = `http://localhost:${portStr ||
          '9000'}?ns=${fbConfig.projectId || 'local'}`;
      }

      fbInstance = adminInstance.initializeApp(fbConfig);
      if (process.env.FIRESTORE_EMULATOR_HOST) {
        const firestoreSettings = firestoreSettingsFromEnv();
        adminInstance.firestore().settings(firestoreSettings);
      }
    } else {
      // Get service account from local file falling back to environment variables
      const serviceAccount = getServiceAccount();
      const projectId = get(serviceAccount, 'project_id');
      if (!isString(projectId)) {
        const missingProjectIdErr =
          'Error project_id from service account to initialize Firebase.';
        console.error(missingProjectIdErr); // eslint-disable-line no-console
        throw new Error(missingProjectIdErr);
      }
      const cleanProjectId = projectId.replace(
        'firebase-top-agent-int',
        'top-agent-int',
      );

      fbInstance = adminInstance.initializeApp({
        credential: adminInstance.credential.cert(serviceAccount as any),
        databaseURL: `https://${cleanProjectId}.firebaseio.com`,
      });
    }
  } catch (err) {
    /* eslint-disable no-console */
    console.error(
      'Error initializing firebase-admin instance from service account.',
    );
    /* eslint-enable no-console */
    throw err;
  }
}

interface FirestoreOptions {
  limit?: number;
  limitToLast?: number;
  where?: any[];
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
):
  | admin.firestore.CollectionReference
  | admin.firestore.DocumentReference
  | admin.firestore.Query {
  if (!slashPath) {
    throw new Error('Path is required to make Firestore Reference');
  }
  const isDocPath = slashPath.split('/').length % 2;

  const ref = isDocPath
    ? firestoreInstance.collection(slashPath)
    : firestoreInstance.doc(slashPath);
  // admin
  //   .firestore()
  //   .collection()
  //   .orderBy()
  //   .limitToLast();
  // Apply orderBy to query if it exists
  if (options?.orderBy && typeof ref.orderBy === 'function') {
    return ref.orderBy(options.orderBy);
  }
  // Apply where to query if it exists
  if (options?.where && typeof ref.where === 'function') {
    return ref.where(...options.where);
  }

  // Apply limit to query if it exists
  if (options?.limit && typeof ref.limit === 'function') {
    return ref.limit(options.limit);
  }

  // Apply limitToLast to query if it exists
  if (options?.limitToLast && typeof ref.limitToLast === 'function') {
    return ref.limitToLast(options.limitToLast);
  }

  return ref;
}
