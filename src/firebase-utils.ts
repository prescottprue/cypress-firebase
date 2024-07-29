import type { AppOptions, app, firestore, credential } from 'firebase-admin';
import { CallFirestoreOptions, WhereOptions } from './attachCustomCommands';
import { convertValueToTimestampOrGeoPointIfPossible } from './tasks';

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
 * Get service account from either SERVICE_ACCOUNT environment variable
 * @returns Service account object
 */
function getServiceAccount(): ServiceAccount | undefined {
  // Environment variable
  const serviceAccountEnvVar = process.env.SERVICE_ACCOUNT;
  if (serviceAccountEnvVar) {
    try {
      return JSON.parse(serviceAccountEnvVar);
    } catch (err) {
      /* eslint-disable no-console */
      console.warn(
        `cypress-firebase: Issue parsing "SERVICE_ACCOUNT" environment variable from string to object, returning string`,
      );
      /* eslint-enable no-console */
    }
  }
}

/**
 * @param adminInstance - firebase-admin instance to initialize
 * @returns Firebase admin credential
 */
function getFirebaseCredential(
  adminInstance: any,
): credential.Credential | undefined {
  const serviceAccount = getServiceAccount();
  // Add service account credential if it exists so that custom auth tokens can be generated
  if (serviceAccount) {
    return adminInstance.credential.cert(serviceAccount);
  }

  // Add default credentials if they exist
  const defaultCredentials = adminInstance.credential.applicationDefault();
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
 * @returns Initialized Firebase instance
 * @param adminInstance - firebase-admin instance to initialize
 * @param overrideConfig - firebase-admin instance to initialize
 */
export function initializeFirebase(
  adminInstance: any,
  overrideConfig?: AppOptions,
): app.App {
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
      const credential = getFirebaseCredential(adminInstance);
      if (credential) {
        fbConfig.credential = credential;
      }
    }

    // Add projectId to fb config if it doesn't already exist
    if (!fbConfig.projectId) {
      const projectId =
        process.env.GCLOUD_PROJECT ||
        (((fbConfig as any) && (fbConfig.credential as any)) || {}).projectId; // eslint-disable-line camelcase
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

    const fbInstance = adminInstance.initializeApp(fbConfig);
    // Initialize Firestore with emulator host settings
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const firestoreSettings = firestoreSettingsFromEnv();
      /* eslint-disable no-console */
      console.log(
        'cypress-firebase: Using Firestore emulator with settings:',
        firestoreSettings,
      );
      /* eslint-enable no-console */
      adminInstance.firestore().settings(firestoreSettings);
    }
    /* eslint-disable no-console */
    const dbUrlLog = fbConfig.databaseURL
      ? ` and databaseURL "${fbConfig.databaseURL}"`
      : '';
    console.log(
      `cypress-firebase: Initialized Firebase app for project "${fbConfig.projectId}"${dbUrlLog}`,
    );
    /* eslint-enable no-console */
    return fbInstance;
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
 * Apply where setting to reference
 * @param ref - Reference
 * @param whereSetting - Where options
 * @param firestoreStatics - Firestore statics
 * @returns Refere with where applied
 */
export function applyWhere(
  ref: firestore.CollectionReference | firestore.Query,
  whereSetting: WhereOptions,
  firestoreStatics: app.App['firestore'],
): firestore.Query {
  const [param, filterOp, val] = whereSetting as WhereOptions;
  return ref.where(
    param,
    filterOp,
    convertValueToTimestampOrGeoPointIfPossible(
      val,
      firestoreStatics as typeof firestore,
    ),
  );
}

/**
 * Convert slash path to Firestore reference
 * @param firestoreStatics - Firestore instance statics (invoking gets instance)
 * @param slashPath - Path to convert into firestore reference
 * @param options - Options object
 * @returns Ref at slash path
 */
export function slashPathToFirestoreRef(
  firestoreStatics: app.App['firestore'],
  slashPath: string,
  options?: CallFirestoreOptions,
):
  | firestore.CollectionReference
  | firestore.DocumentReference
  | firestore.Query {
  if (!slashPath) {
    throw new Error('Path is required to make Firestore Reference');
  }

  const firestoreInstance = firestoreStatics();
  if (isDocPath(slashPath)) {
    return firestoreInstance.doc(slashPath);
  }

  let ref: firestore.CollectionReference | firestore.Query =
    firestoreInstance.collection(slashPath);

  // Apply orderBy to query if it exists
  if (options && options.orderBy && typeof ref.orderBy === 'function') {
    if (Array.isArray(options.orderBy)) {
      ref = ref.orderBy(...options.orderBy);
    } else {
      ref = ref.orderBy(options.orderBy);
    }
  }
  // Apply where to query if it exists
  if (
    options &&
    options.where &&
    Array.isArray(options.where) &&
    typeof ref.where === 'function'
  ) {
    if (Array.isArray(options.where[0])) {
      (options.where as WhereOptions[]).forEach((whereCondition) => {
        ref = applyWhere(
          ref,
          whereCondition,
          options.statics || firestoreStatics,
        );
      });
    } else {
      ref = applyWhere(
        ref,
        options.where as WhereOptions,
        options.statics || firestoreStatics,
      );
    }
  }

  // Apply limit to query if it exists
  if (options && options.limit && typeof ref.limit === 'function') {
    ref = ref.limit(options.limit);
  }

  // Apply limitToLast to query if it exists
  if (options && options.limitToLast && typeof ref.limitToLast === 'function') {
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
    .then((snapshot: firestore.QuerySnapshot) => {
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
  if (!(options && options.orderBy)) {
    baseQuery = refOrQuery.orderBy('__name__');
  }

  // Limit to batches to set batchSize or 500
  if (!(options && options.limit)) {
    baseQuery = refOrQuery.limit((options && options.batchSize) || 500);
  }

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, baseQuery, resolve, reject);
  });
}
