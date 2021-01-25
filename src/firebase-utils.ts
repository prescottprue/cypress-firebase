import * as admin from 'firebase-admin';
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

let fbInstance: admin.app.App;

/**
 * Initialize Firebase instance from service account (from either local
 * serviceAccount.json or environment variables)
 * @returns Initialized Firebase instance
 * @param adminInstance - firebase-admin instance to initialize
 */
export function initializeFirebase(adminInstance: any): admin.app.App {
  if (fbInstance) {
    return fbInstance;
  }
  try {
    // TODO: Look into using @firebase/testing in place of admin here to allow for
    // usage of clearFirestoreData (see https://github.com/prescottprue/cypress-firebase/issues/73 for more info)
    const serviceAccount = getServiceAccount();
    const projectId =
      process.env.GCLOUD_PROJECT ||
      process.env.FIREBASE_PROJECT ||
      process.env.FIREBASE_PROJECT_ID ||
      serviceAccount?.project_id; // eslint-disable-line camelcase
    const fbConfig: any = {
      projectId,
    };

    // Initialize RTDB with databaseURL from FIREBASE_DATABASE_EMULATOR_HOST to allow for RTDB actions
    // within Emulator
    if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
      fbConfig.databaseURL = `http://${
        process.env.FIREBASE_DATABASE_EMULATOR_HOST
      }?ns=${fbConfig.projectId || 'local'}`;
      /* eslint-disable no-console */
      console.log(
        'cypress-firebase: Using RTDB emulator with DB URL:',
        fbConfig.databaseURL,
      );
      /* eslint-enable no-console */
    } else {
      const cleanProjectId = (projectId as string).replace(
        'firebase-top-agent-int',
        'top-agent-int',
      );

      fbConfig.databaseURL = `https://${cleanProjectId}.firebaseio.com`;
    }

    // Add service account credential if it exists so that custom auth tokens can be generated
    if (serviceAccount) {
      fbConfig.credential = adminInstance.credential.cert(serviceAccount);
    }

    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      /* eslint-disable no-console */
      console.log(
        'cypress-firebase: Using Auth emulator with port:',
        process.env.FIREBASE_AUTH_EMULATOR_HOST,
      );
      /* eslint-enable no-console */
    }

    fbInstance = adminInstance.initializeApp(fbConfig);

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
    console.log(
      `cypress-firebase: Initialized app with database url "${fbConfig.projectId}"`,
    );
    /* eslint-enable no-console */
    return fbInstance;
  } catch (err) {
    /* eslint-disable no-console */
    console.error(
      'cypress-firebase: Error initializing firebase-admin instance:',
      err.message,
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
 * @param slashPath - Path to convert into firestore refernce
 * @param options - Options object
 * @returns Ref at slash path
 */
export function slashPathToFirestoreRef(
  firestoreInstance: any,
  slashPath: string,
  options?: CallFirestoreOptions,
):
  | admin.firestore.CollectionReference
  | admin.firestore.DocumentReference
  | admin.firestore.Query {
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
  query: admin.firestore.CollectionReference,
  resolve: (value?: any) => any,
  reject: any,
): void {
  query
    .get()
    .then((snapshot: admin.firestore.QuerySnapshot) => {
      // When there are no documents left, we are done
      if (snapshot.size === 0) {
        return 0;
      }

      // Delete documents in a batch
      const batch = db.batch();
      snapshot.docs.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
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
 * @param db - Firestore instance
 * @param collectionPath - Path of collection
 * @param batchSize - Size of delete batch
 * @returns Promise which resolves with results of deleting batch
 */
export function deleteCollection(
  db: any,
  collectionPath: string,
  batchSize?: number,
): Promise<any> {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize || 500);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve, reject);
  });
}
