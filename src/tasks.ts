import type { database, firestore, auth, app } from 'firebase-admin';
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

/**
 * @param baseRef - Base RTDB reference
 * @param options - Options for ref
 * @returns RTDB Reference
 */
function optionsToRtdbRef(
  baseRef: database.Reference,
  options?: CallRtdbOptions,
): database.Reference | database.Query {
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
 * @param adminInstance - Admin SDK instance
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Firebase Auth or TenantAwareAuth instance
 */
function getAuth(
  adminInstance: any,
  tenantId?: string,
): auth.Auth | auth.TenantAwareAuth {
  const auth = tenantId
    ? adminInstance.auth().tenantManager().authForTenant(tenantId)
    : adminInstance.auth();
  return auth;
}

/**
 * @param dataVal - Value of data
 * @param firestoreStatics - Statics from firestore instance
 * @returns Value converted into timestamp object if possible
 */
function convertValueToTimestampOrGeoPointIfPossible(
  dataVal: any,
  firestoreStatics: typeof firestore,
): firestore.FieldValue {
  /* eslint-disable-next-line no-underscore-dangle */
  if (dataVal?._methodName === 'FieldValue.serverTimestamp') {
    return firestoreStatics.FieldValue.serverTimestamp();
  }
  if (
    typeof dataVal?.seconds === 'number' &&
    typeof dataVal?.nanoseconds === 'number'
  ) {
    return new firestoreStatics.Timestamp(dataVal.seconds, dataVal.nanoseconds);
  }
  if (
    typeof dataVal?.latitude === 'number' &&
    typeof dataVal?.longitude === 'number'
  ) {
    return new firestoreStatics.GeoPoint(dataVal.latitude, dataVal.longitude);
  }

  return dataVal;
}

/**
 * @param data - Data to be set in firestore
 * @param firestoreStatics - Statics from Firestore object
 * @returns Data to be set in firestore with timestamp
 */
function getDataWithTimestampsAndGeoPoints(
  data: firestore.DocumentData,
  firestoreStatics: typeof firestore,
): Record<string, any> {
  // Exit if no statics are passed
  if (!firestoreStatics) {
    return data;
  }
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
        [currKey]: getDataWithTimestampsAndGeoPoints(
          currData,
          firestoreStatics,
        ),
      };
    }
    const value = Array.isArray(currData)
      ? currData.map((dataItem) => {
          const result = convertValueToTimestampOrGeoPointIfPossible(
            dataItem,
            firestoreStatics,
          );

          return result.constructor === Object
            ? getDataWithTimestampsAndGeoPoints(result, firestoreStatics)
            : result;
        })
      : convertValueToTimestampOrGeoPointIfPossible(currData, firestoreStatics);

    return {
      ...acc,
      [currKey]: value,
    };
  }, {});
}

/**
 * @param adminInstance - firebase-admin instance
 * @param action - Action to run
 * @param actionPath - Path in RTDB
 * @param options - Query options
 * @param data - Data to pass to action
 * @returns Promise which resolves with results of calling RTDB
 */
export async function callRtdb(
  adminInstance: any,
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
    const dbRef: database.Reference = adminInstance.database().ref(actionPath);
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
 * @param adminInstance - firebase-admin instance
 * @param action - Action to run
 * @param actionPath - Path to collection or document within Firestore
 * @param options - Query options
 * @param data - Data to pass to action
 * @returns Promise which resolves with results of calling Firestore
 */
export async function callFirestore(
  adminInstance: app.App,
  action: FirestoreAction,
  actionPath: string,
  options?: CallFirestoreOptions,
  data?: FixtureData,
): Promise<any> {
  try {
    if (action === 'get') {
      const snap = await (
        slashPathToFirestoreRef(
          adminInstance.firestore(),
          actionPath,
          options,
        ) as any
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
              adminInstance.firestore(),
              actionPath,
              options,
            ) as FirebaseFirestore.DocumentReference
          ).delete()
        : deleteCollection(
            adminInstance.firestore(),
            slashPathToFirestoreRef(
              adminInstance.firestore(),
              actionPath,
              options,
            ) as
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

    const dataToSet = getDataWithTimestampsAndGeoPoints(
      data,
      // Use static option if passed (tests), otherwise fallback to statics on adminInstance
      // Tests do not have statics since they are using @firebase/testing
      options?.statics || (adminInstance.firestore as typeof firestore),
    );

    if (action === 'set') {
      return adminInstance
        .firestore()
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
      slashPathToFirestoreRef(
        adminInstance.firestore(),
        actionPath,
        options,
      ) as any
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

/**
 * Create a custom token
 * @param adminInstance - Admin SDK instance
 * @param uid - UID of user for which the custom token will be generated
 * @param settings - Settings object
 * @returns Promise which resolves with a custom Firebase Auth token
 */
export function createCustomToken(
  adminInstance: any,
  uid: string,
  settings?: any,
): Promise<string> {
  // Use custom claims or default to { isTesting: true }
  const customClaims = settings?.customClaims || { isTesting: true };

  // Create auth token
  return getAuth(adminInstance, settings.tenantId).createCustomToken(
    uid,
    customClaims,
  );
}

/**
 * Get Firebase Auth user based on UID
 * @param adminInstance - Admin SDK instance
 * @param uid - UID of user for which the custom token will be generated
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with a custom Firebase Auth token
 */
export function getAuthUser(
  adminInstance: any,
  uid: string,
  tenantId?: string,
): Promise<auth.UserRecord> {
  return getAuth(adminInstance, tenantId).getUser(uid);
}
