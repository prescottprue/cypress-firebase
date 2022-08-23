import type { firestore } from 'firebase-admin';
import {
  initializeApp,
  applicationDefault,
  cert,
  Credential,
  AppOptions,
  ServiceAccount,
  App,
} from 'firebase-admin/app';
import type {
  Settings,
  CollectionReference,
  DocumentReference,
  Query,
  QuerySnapshot,
} from 'firebase-admin/firestore';
import { getServiceAccount } from './node-utils';
import { CallFirestoreOptions } from './attachCustomCommands';

/**
 * Check whether a value is a string or not
 * @param valToCheck - Value to check
 * @returns Whether or not value is a string
 */
export function isString(valToCheck: any): boolean {
  return typeof valToCheck === 'string' || valToCheck instanceof String;
}

/**
 * Get settings for Firestore from environment. Loads port and servicePath from
 * FIRESTORE_EMULATOR_HOST node environment variable if found, otherwise
 * defaults to port 8080 and servicePath "localhost".
 * @returns Firestore settings to be passed to firebase.firestore().settings
 */
function firestoreSettingsFromEnv(): Settings {
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

/**
 * @param adminInstance - firebase-admin instance to initialize
 * @returns Firebase admin credential
 */
function getFirebaseCredential(): Credential | undefined {
  const serviceAccount = getServiceAccount();
  // Add service account credential if it exists so that custom auth tokens can be generated
  if (serviceAccount) {
    return cert(serviceAccount as ServiceAccount);
  }

  // Add default credentials if they exist
  const defaultCredentials = applicationDefault();
  if (defaultCredentials) {
    console.log('cypress-firebase: Using default credentials'); // eslint-disable-line no-console
    return defaultCredentials;
  }
}

/**
 * Get default datbase url
 * @param projectId - Project id
 * @returns Default database url
 */
function getDefaultDatabaseUrl(projectId?: string): string {
  const { FIREBASE_DATABASE_EMULATOR_HOST } = process.env;
  return FIREBASE_DATABASE_EMULATOR_HOST
    ? `http://${FIREBASE_DATABASE_EMULATOR_HOST}?ns=${projectId || 'local'}`
    : `https://${projectId}.firebaseio.com`;
}

/**
 * Initialize Firebase instance from service account (from either local
 * serviceAccount.json or environment variables)
 * @param overrideConfig - firebase-admin instance to initialize
 */
export function initializeFirebase(overrideConfig?: AppOptions): App {
  try {
    // TODO: Look into using @firebase/testing in place of admin here to allow for
    // usage of clearFirestoreData (see https://github.com/prescottprue/cypress-firebase/issues/73 for more info)
    const { FIREBASE_DATABASE_EMULATOR_HOST } = process.env;
    const fbConfig: AppOptions = {
      // Initialize RTDB with databaseURL pointed to emulator if FIREBASE_DATABASE_EMULATOR_HOST is set
      ...overrideConfig,
    };

    if (FIREBASE_DATABASE_EMULATOR_HOST) {
      /* eslint-disable no-console */
      console.log(
        'cypress-firebase: Using RTDB emulator with host:',
        FIREBASE_DATABASE_EMULATOR_HOST,
      );
      /* eslint-enable no-console */
    }

    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      /* eslint-disable no-console */
      console.log(
        'cypress-firebase: Using Auth emulator with port:',
        process.env.FIREBASE_AUTH_EMULATOR_HOST,
      );
      /* eslint-enable no-console */
    }

    // Add credentials if they do not already exist - starting with application default, falling back to SERVICE_ACCOUNT env variable
    if (!fbConfig.credential) {
      const credential = getFirebaseCredential();
      if (credential) {
        fbConfig.credential = credential;
      }
    }

    // Add projectId to fb config if it doesn't already exist
    if (!fbConfig.projectId) {
      const projectId =
        process.env.GCLOUD_PROJECT || (fbConfig.credential as any)?.projectId; // eslint-disable-line camelcase
      if (projectId) {
        fbConfig.projectId = projectId;
      }
    }

    // Add databaseURL if it doesn't already exist
    if (!fbConfig.databaseURL) {
      const databaseURL = getDefaultDatabaseUrl(fbConfig.projectId);
      if (databaseURL) {
        fbConfig.databaseURL = databaseURL;
      }
    }

    const app = initializeApp(fbConfig);
    // Initialize Firestore with emulator host settings
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const firestoreSettings = firestoreSettingsFromEnv();
      /* eslint-disable no-console */
      console.log(
        'cypress-firebase: Using Firestore emulator with settings:',
        firestoreSettings,
      );
      /* eslint-enable no-console */
    }
    /* eslint-disable no-console */
    const dbUrlLog = fbConfig.databaseURL
      ? ` and databaseURL "${fbConfig.databaseURL}"`
      : '';
    console.log(
      `cypress-firebase: Initialized Firebase app for project "${fbConfig.projectId}"${dbUrlLog}`,
    );
    return app;
    /* eslint-enable no-console */
  } catch (err) {
    /* eslint-disable no-console */
    console.error(
      'cypress-firebase: Error initializing firebase-admin instance:',
      err instanceof Error && err.message,
    );
    /* eslint-enable no-console */
    throw err;
  }
}

/**
 * Check with or not a slash path is the path of a document
 * @param slashPath - Path to check for whether or not it is a doc
 * @returns Whether or not slash path is a document path
 */
export function isDocPath(slashPath: string): boolean {
  return !(slashPath.replace(/^\/|\/$/g, '').split('/').length % 2);
}

/**
 * Convert slash path to Firestore reference
 * @param firestoreInstance - Instance on which to
 * create ref
 * @param slashPath - Path to convert into firestore reference
 * @param options - Options object
 * @returns Ref at slash path
 */
export function slashPathToFirestoreRef(
  firestoreInstance: any,
  slashPath: string,
  options?: CallFirestoreOptions,
): CollectionReference | DocumentReference | Query {
  if (!slashPath) {
    throw new Error('Path is required to make Firestore Reference');
  }

  let ref = isDocPath(slashPath)
    ? firestoreInstance.doc(slashPath)
    : firestoreInstance.collection(slashPath);

  // Apply orderBy to query if it exists
  if (options?.orderBy && typeof ref.orderBy === 'function') {
    if (Array.isArray(options.orderBy)) {
      ref = ref.orderBy(...options.orderBy);
    } else {
      ref = ref.orderBy(options.orderBy);
    }
  }
  // Apply where to query if it exists
  if (
    options?.where &&
    Array.isArray(options.where) &&
    typeof ref.where === 'function'
  ) {
    if (Array.isArray(options.where[0])) {
      ref = ref.where(...options.where[0]).where(...options.where[1]);
    } else {
      ref = ref.where(...options.where);
    }
  }

  // Apply limit to query if it exists
  if (options?.limit && typeof ref.limit === 'function') {
    ref = ref.limit(options.limit);
  }

  // Apply limitToLast to query if it exists
  if (options?.limitToLast && typeof ref.limitToLast === 'function') {
    ref = ref.limitToLast(options.limitToLast);
  }

  return ref;
}

/**
 * @param db - Firestore instance
 * @param query - Query which is limited to batch size
 * @param resolve - Resolve function
 * @param reject - Reject function
 */
function deleteQueryBatch(
  db: any,
  query: FirebaseFirestore.CollectionReference | FirebaseFirestore.Query,
  resolve: (value?: any) => any,
  reject: any,
): void {
  query
    .get()
    .then((snapshot: QuerySnapshot) => {
      // When there are no documents left, we are done
      if (snapshot.size === 0) {
        return 0;
      }

      // Delete documents in a batch
      const batch = db.batch();
      snapshot.docs.forEach((doc: firestore.QueryDocumentSnapshot) => {
        batch.delete(doc.ref);
      });

      return batch.commit().then(() => snapshot.size);
    })
    .then((numDeleted: number) => {
      if (numDeleted === 0) {
        resolve();
        return;
      }

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      process.nextTick(() => {
        deleteQueryBatch(db, query, resolve, reject);
      });
    })
    .catch(reject);
}

/**
 * @param db - Firestore database instance
 * @param refOrQuery - Firestore instance
 * @param options - Call Firestore options
 * @returns Promise which resolves with results of deleting batch
 */
export function deleteCollection(
  db: any,
  refOrQuery: FirebaseFirestore.CollectionReference | FirebaseFirestore.Query,
  options?: CallFirestoreOptions,
): Promise<any> {
  let baseQuery = refOrQuery.orderBy('__name__');

  // If no ordering is applied, order by id (__name__) to have groups in order
  if (!options?.orderBy) {
    baseQuery = refOrQuery.orderBy('__name__');
  }

  // Limit to batches to set batchSize or 500
  if (!options?.limit) {
    baseQuery = refOrQuery.limit(options?.batchSize || 500);
  }

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, baseQuery, resolve, reject);
  });
}
