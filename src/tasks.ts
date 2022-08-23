import { getDatabase, Reference, Query } from 'firebase-admin/database';
import {
  getAuth as getFirebaseAuth,
  Auth,
  TenantAwareAuth,
  UserRecord,
} from 'firebase-admin/auth';
import {
  getFirestore,
  Timestamp,
  GeoPoint,
  FieldValue,
  DocumentData,
} from 'firebase-admin/firestore';
import { getApp } from 'firebase-admin/app';
import {
  FixtureData,
  FirestoreAction,
  RTDBAction,
  CallRtdbOptions,
  CallFirestoreOptions,
} from './attachCustomCommands';
import {
  slashPathToFirestoreRef,
  deleteCollection,
  isDocPath,
} from './firebase-utils';
import { AppOptions } from './types';

/**
 * @param baseRef - Base RTDB reference
 * @param options - Options for ref
 * @returns RTDB Reference
 */
function optionsToRtdbRef(
  baseRef: Reference,
  options?: CallRtdbOptions,
): Reference | Query {
  let newRef = baseRef;
  [
    'orderByChild',
    'orderByKey',
    'orderByValue',
    'equalTo',
    'startAfter',
    'startAt',
    'endBefore',
    'endAt',
    'limitToFirst',
    'limitToLast',
  ].forEach((optionName: string) => {
    if (options && (options as any)[optionName]) {
      const args = (options as any)[optionName];
      // Spread arg arrays (such as startAfter and endBefore)
      if (Array.isArray(args)) {
        newRef = (newRef as any)[optionName](...args);
      } else {
        newRef = (newRef as any)[optionName](args);
      }
    }
  });
  return newRef;
}

/**
 * Get Firebase Auth or TenantAwareAuth instance, based on tenantId being provided
 * @param authSettings - Optional ID of tenant used for multi-tenancy
 * @param authSettings.tenantId - Optional ID of tenant used for multi-tenancy
 * @param authSettings.appName - Optional name of Firebase app. Defaults to "[DEFAULT]"
 * @returns Firebase Auth or TenantAwareAuth instance
 */
function getAdminAuthWithTenantId(authSettings?: {
  tenantId?: string;
  appName?: string;
}): Auth | TenantAwareAuth {
  const { tenantId, appName } = authSettings || {};
  const authInstance = getFirebaseAuth(appName ? getApp(appName) : undefined);
  const auth = tenantId
    ? authInstance.tenantManager().authForTenant(tenantId)
    : authInstance;
  return auth;
}

/**
 * @param dataVal - Value of data
 * @returns Value converted into timestamp object if possible
 */
function convertValueToTimestampOrGeoPointIfPossible(dataVal: any): FieldValue {
  /* eslint-disable-next-line no-underscore-dangle */
  if (dataVal?._methodName === 'FieldValue.serverTimestamp') {
    return FieldValue.serverTimestamp();
  }
  if (
    typeof dataVal?.seconds === 'number' &&
    typeof dataVal?.nanoseconds === 'number'
  ) {
    return new Timestamp(dataVal.seconds, dataVal.nanoseconds);
  }
  if (
    typeof dataVal?.latitude === 'number' &&
    typeof dataVal?.longitude === 'number'
  ) {
    return new GeoPoint(dataVal.latitude, dataVal.longitude);
  }

  return dataVal;
}

/**
 * @param data - Data to be set in firestore
 * @returns Data to be set in firestore with timestamp
 */
function getDataWithTimestampsAndGeoPoints(
  data: DocumentData,
): Record<string, any> {
  return Object.entries(data).reduce((acc, [currKey, currData]) => {
    // Convert nested timestamp if item is an object
    if (
      typeof currData === 'object' &&
      currData !== null &&
      !Array.isArray(currData) &&
      /* eslint-disable-next-line no-underscore-dangle */
      !currData._methodName &&
      !currData.seconds &&
      !(currData.latitude && currData.longitude)
    ) {
      return {
        ...acc,
        [currKey]: getDataWithTimestampsAndGeoPoints(currData),
      };
    }
    const value = Array.isArray(currData)
      ? currData.map((dataItem) =>
          convertValueToTimestampOrGeoPointIfPossible(dataItem),
        )
      : convertValueToTimestampOrGeoPointIfPossible(currData);

    return {
      ...acc,
      [currKey]: value,
    };
  }, {});
}

/**
 * @param action - Action to run
 * @param actionPath - Path in RTDB
 * @param options - Query options
 * @param data - Data to pass to action
 * @returns Promise which resolves with results of calling RTDB
 */
export async function callRtdb(
  action: RTDBAction,
  actionPath: string,
  options?: CallRtdbOptions,
  data?: FixtureData | string | boolean,
): Promise<any> {
  // Handle actionPath not being set (see #244 for more info)
  if (!actionPath) {
    throw new Error(
      'actionPath is required for callRtdb. Use "/" for top level actions.',
    );
  }

  try {
    const dbInstance = getDatabase(
      options?.appName ? getApp(options.appName) : undefined,
    );
    const dbRef: Reference = dbInstance.ref(actionPath);
    if (action === 'get') {
      const snap = await optionsToRtdbRef(dbRef, options).once('value');
      return snap.val();
    }

    if (action === 'push') {
      const pushRef = dbRef.push();
      await pushRef.set(data);
      // TODO: Return key on an object for consistent return regardless of action
      return pushRef.key;
    }

    // Delete action
    const actionNameMap = {
      delete: 'remove',
    };
    type RTDBMethod = 'push' | 'remove' | 'set' | 'update' | 'get';
    const cleanedActionName: RTDBMethod =
      (actionNameMap as any)[action] || action;
    await dbRef[cleanedActionName](data);
    // Prevents Cypress error with message:
    // "You must return a promise, a value, or null to indicate that the task was handled."
    return null;
  } catch (err) {
    /* eslint-disable no-console */
    console.error(
      `cypress-firebase: Error with RTDB "${action}" at path "${actionPath}" :`,
      err,
    );
    /* eslint-enable no-console */
    throw err;
  }
}

/**
 * @param action - Action to run
 * @param actionPath - Path to collection or document within Firestore
 * @param options - Query options
 * @param data - Data to pass to action
 * @returns Promise which resolves with results of calling Firestore
 */
export async function callFirestore(
  action: FirestoreAction,
  actionPath: string,
  options?: CallFirestoreOptions,
  data?: FixtureData,
): Promise<any> {
  const firestoreInstance = getFirestore(
    options?.appName ? getApp(options.appName) : undefined,
  );
  try {
    if (action === 'get') {
      const snap = await (
        slashPathToFirestoreRef(firestoreInstance, actionPath, options) as any
      ).get();

      if (snap?.docs?.length && typeof snap.docs.map === 'function') {
        return snap.docs.map((docSnap: FirebaseFirestore.DocumentSnapshot) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
      }
      // Falling back to null in the case of falsey value prevents Cypress error with message:
      // "You must return a promise, a value, or null to indicate that the task was handled."
      return (typeof snap?.data === 'function' && snap.data()) || null;
    }

    if (action === 'delete') {
      // Handle deleting of collections & sub-collections if not a doc path
      const deletePromise = isDocPath(actionPath)
        ? (
            slashPathToFirestoreRef(
              firestoreInstance,
              actionPath,
              options,
            ) as FirebaseFirestore.DocumentReference
          ).delete()
        : deleteCollection(
            firestoreInstance,
            slashPathToFirestoreRef(firestoreInstance, actionPath, options) as
              | FirebaseFirestore.CollectionReference
              | FirebaseFirestore.Query,
            options,
          );
      await deletePromise;
      // Returning null in the case of falsey value prevents Cypress error with message:
      // "You must return a promise, a value, or null to indicate that the task was handled."
      return null;
    }

    if (!data) {
      throw new Error(`You must define data to run ${action} in firestore.`);
    }

    const dataToSet = getDataWithTimestampsAndGeoPoints(data);

    if (action === 'set') {
      return firestoreInstance
        .doc(actionPath)
        .set(
          dataToSet,
          options?.merge
            ? ({ merge: options?.merge } as FirebaseFirestore.SetOptions)
            : (undefined as any),
        );
    }
    // "update" action
    return (
      slashPathToFirestoreRef(firestoreInstance, actionPath, options) as any
    )[action](dataToSet);
  } catch (err) {
    /* eslint-disable no-console */
    console.error(
      `cypress-firebase: Error with Firestore "${action}" at path "${actionPath}" :`,
      err,
    );
    /* eslint-enable no-console */
    throw err;
  }
}

export interface CustomTokenTaskSettings extends AppOptions {
  uid: string;
  customClaims?: any;
}

/**
 * Create a custom token
 * @param settings - Settings object
 * @returns Promise which resolves with a custom Firebase Auth token
 */
export function createCustomToken(
  settings: CustomTokenTaskSettings,
): Promise<string> {
  // Use custom claims or default to { isTesting: true }
  const customClaims = settings?.customClaims || { isTesting: true };

  // Create auth token
  return getAdminAuthWithTenantId(settings).createCustomToken(
    settings.uid,
    customClaims,
  );
}

export interface GetAuthUserTaskSettings extends AppOptions {
  uid: string;
}

/**
 * Get Firebase Auth user based on UID
 * @param settings - Task settings
 * @param settings.uid - UID of user for which the custom token will be generated
 * @param settings.tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with a custom Firebase Auth token
 */
export function getAuthUser(
  settings: GetAuthUserTaskSettings,
): Promise<UserRecord> {
  return getAdminAuthWithTenantId(settings).getUser(settings.uid);
}
