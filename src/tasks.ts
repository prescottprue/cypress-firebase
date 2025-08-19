import type { app, auth, database, firestore } from 'firebase-admin';
import type {
  AttachCustomCommandParams,
  CallFirestoreOptions,
  CallRtdbOptions,
  FirestoreAction,
  FixtureData,
  RTDBAction,
} from './attachCustomCommands';
import {
  deleteCollection,
  isDocPath,
  slashPathToFirestoreRef,
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
  ]
    .forEach((optionName: string) => {
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
 * Convert unique data types which have been stringified and parsed back
 * into their original type.
 * @param dataVal - Value of data
 * @param firestoreStatics - Statics from firestore instance
 * @returns Value converted into timestamp object if possible
 */
export function convertValueToTimestampOrGeoPointIfPossible(
  dataVal: any,
  firestoreStatics: typeof firestore,
): firestore.FieldValue {
  if (
    (dataVal && dataVal._methodName === 'serverTimestamp') ||
    (dataVal && dataVal._methodName === 'FieldValue.serverTimestamp') // v8 and earlier
  ) {
    return firestoreStatics.FieldValue.serverTimestamp();
  }
  if (
    (dataVal && dataVal._methodName === 'deleteField') ||
    (dataVal && dataVal._methodName === 'FieldValue.delete') // v8 and earlier
  ) {
    return firestoreStatics.FieldValue.delete();
  }
  if (
    typeof dataVal !== 'undefined' &&
    dataVal !== null &&
    typeof dataVal.seconds === 'number' &&
    typeof dataVal.nanoseconds === 'number'
  ) {
    return new firestoreStatics.Timestamp(dataVal.seconds, dataVal.nanoseconds);
  }
  if (
    typeof dataVal !== 'undefined' &&
    dataVal !== null &&
    typeof dataVal.latitude === 'number' &&
    typeof dataVal.longitude === 'number'
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
      !currData._methodName &&
      !currData.seconds &&
      !(currData.latitude && currData.longitude)
    ) {
      return {
        // biome-ignore lint/performance/noAccumulatingSpread: will switch when changing src
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
      // biome-ignore lint/performance/noAccumulatingSpread: will switch when changing src
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
    // biome-ignore lint/suspicious/noConsole: Intentional logging
    console.error(
      `cypress-firebase: Error with RTDB "${action}" at path "${actionPath}" :`,
      err,
    );
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
          adminInstance.firestore,
          actionPath,
          options,
        ) as any
      ).get();

      if (
        snap &&
        snap.docs &&
        snap.docs.length &&
        typeof snap.docs.map === 'function'
      ) {
        return snap.docs.map((docSnap: FirebaseFirestore.DocumentSnapshot) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
      }
      // Falling back to null in the case of falsey value prevents Cypress error with message:
      // "You must return a promise, a value, or null to indicate that the task was handled."
      return (snap && typeof snap.data === 'function' && snap.data()) || null;
    }

    if (action === 'delete') {
      // Handle deleting of collections & sub-collections if not a doc path
      const deletePromise = isDocPath(actionPath)
        ? (
            slashPathToFirestoreRef(
              adminInstance.firestore,
              actionPath,
              options,
            ) as FirebaseFirestore.DocumentReference
          ).delete()
        : deleteCollection(
            adminInstance.firestore(),
            slashPathToFirestoreRef(
              adminInstance.firestore,
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
      (options && options.statics) ||
        (adminInstance.firestore as typeof firestore),
    );

    if (action === 'set') {
      return adminInstance
        .firestore()
        .doc(actionPath)
        .set(
          dataToSet,
          options && options.merge
            ? ({
                merge: options.merge,
              } as FirebaseFirestore.SetOptions)
            : (undefined as any),
        );
    }
    // "update" and "add" action
    return (
      slashPathToFirestoreRef(
        adminInstance.firestore,
        actionPath,
        options,
      ) as any
    )[action](dataToSet);
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: Intentional logging
    console.error(
      `cypress-firebase: Error with Firestore "${action}" at path "${actionPath}" :`,
      err,
    );
    throw err;
  }
}
/**
 * Create a Firebase Auth user
 * @param adminInstance - Admin SDK instance
 * @param properties - The properties to set on the new user record to be created
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with a UserRecord
 */
export function authCreateUser(
  adminInstance: any,
  properties: auth.CreateRequest,
  tenantId?: string,
): Promise<
  | auth.UserRecord
  | 'auth/email-already-exists'
  | 'auth/phone-number-already-exists'
> {
  return getAuth(adminInstance, tenantId)
    .createUser(properties)
    .catch((err) => {
      if (err.code === 'auth/email-already-exists')
        return 'auth/email-already-exists';
      if (err.code === 'auth/phone-number-already-exists')
        return 'auth/phone-number-already-exists';
      throw err;
    });
}
/**
 * Import list of Firebase Auth users
 * @param adminInstance - Admin SDK instance
 * @param usersImport - The list of user records to import to Firebase Auth
 * @param importOptions - Optional options for the user import
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise that resolves when the operation completes with the result of the import
 */
export function authImportUsers(
  adminInstance: any,
  usersImport: auth.UserImportRecord[],
  importOptions?: auth.UserImportOptions,
  tenantId?: string,
): Promise<auth.UserImportResult> {
  return getAuth(adminInstance, tenantId).importUsers(
    usersImport,
    importOptions,
  );
}

/**
 * List Firebase Auth users
 * @param adminInstance - Admin SDK instance
 * @param maxResults - The page size, 1000 if undefined
 * @param pageToken - The next page token
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise that resolves with the current batch of downloaded users and the next page token
 */
export function authListUsers(
  adminInstance: any,
  maxResults?: number,
  pageToken?: string,
  tenantId?: string,
): Promise<auth.ListUsersResult> {
  return getAuth(adminInstance, tenantId).listUsers(maxResults, pageToken);
}

/**
 * Get Firebase Auth user based on UID
 * @param adminInstance - Admin SDK instance
 * @param uid - UID of the user whose data to fetch
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with a UserRecord
 */
export function authGetUser(
  adminInstance: any,
  uid: string,
  tenantId?: string,
): Promise<auth.UserRecord | 'auth/user-not-found'> {
  return getAuth(adminInstance, tenantId)
    .getUser(uid)
    .catch((err) => {
      if (err.code === 'auth/user-not-found') return 'auth/user-not-found';
      throw err;
    });
}
/**
 * Get Firebase Auth user based on email
 * @param adminInstance - Admin SDK instance
 * @param email - Email of the user whose data to fetch
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with a UserRecord
 */
export function authGetUserByEmail(
  adminInstance: any,
  email: string,
  tenantId?: string,
): Promise<auth.UserRecord | 'auth/user-not-found'> {
  return getAuth(adminInstance, tenantId)
    .getUserByEmail(email)
    .catch((err) => {
      if (err.code === 'auth/user-not-found') return 'auth/user-not-found';
      throw err;
    });
}
/**
 * Get Firebase Auth user based on phone number
 * @param adminInstance - Admin SDK instance
 * @param phoneNumber - Phone number of the user whose data to fetch
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with a UserRecord
 */
export function authGetUserByPhoneNumber(
  adminInstance: any,
  phoneNumber: string,
  tenantId?: string,
): Promise<auth.UserRecord | 'auth/user-not-found'> {
  return getAuth(adminInstance, tenantId)
    .getUserByPhoneNumber(phoneNumber)
    .catch((err) => {
      if (err.code === 'auth/user-not-found') return 'auth/user-not-found';
      throw err;
    });
}
/**
 * Get Firebase Auth user based on phone number
 * @param adminInstance - Admin SDK instance
 * @param providerId - The Provider ID
 * @param uid - The user identifier for the given provider
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with a UserRecord
 */
export function authGetUserByProviderUid(
  adminInstance: any,
  providerId: string,
  uid: string,
  tenantId?: string,
): Promise<auth.UserRecord | 'auth/user-not-found'> {
  return getAuth(adminInstance, tenantId)
    .getUserByProviderUid(providerId, uid)
    .catch((err) => {
      if (err.code === 'auth/user-not-found') return 'auth/user-not-found';
      throw err;
    });
}
/**
 * Get Firebase Auth users based on identifiers
 * @param adminInstance - Admin SDK instance
 * @param identifiers - The identifiers used to indicate which user records should be returned.
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with a GetUsersResult object
 */
export function authGetUsers(
  adminInstance: any,
  identifiers: auth.UserIdentifier[],
  tenantId?: string,
): Promise<auth.GetUsersResult> {
  return getAuth(adminInstance, tenantId).getUsers(identifiers);
}

/**
 * Update an existing Firebase Auth user
 * @param adminInstance - Admin SDK instance
 * @param uid - UID of the user to edit
 * @param properties - The properties to update on the user
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise that resolves with a UserRecord
 */
export function authUpdateUser(
  adminInstance: any,
  uid: string,
  properties: auth.UpdateRequest,
  tenantId?: string,
): Promise<auth.UserRecord> {
  return getAuth(adminInstance, tenantId).updateUser(uid, properties);
}
/**
 * Delete multiple Firebase Auth users
 * @param adminInstance - Admin SDK instance
 * @param uid - UID of the user to edit
 * @param customClaims - The custom claims to set, null deletes the custom claims
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise that resolves with null when the operation completes
 */
export function authSetCustomUserClaims(
  adminInstance: any,
  uid: string,
  customClaims: object | null,
  tenantId?: string,
): Promise<null> {
  return getAuth(adminInstance, tenantId)
    .setCustomUserClaims(uid, customClaims)
    .then(() => null);
}

/**
 * Delete a Firebase Auth user
 * @param adminInstance - Admin SDK instance
 * @param uid - UID of the user to delete
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise that resolves to null when user is deleted
 */
export function authDeleteUser(
  adminInstance: any,
  uid: string,
  tenantId?: string,
): Promise<null> {
  return getAuth(adminInstance, tenantId)
    .deleteUser(uid)
    .then(() => null);
}
/**
 * Delete multiple Firebase Auth users
 * @param adminInstance - Admin SDK instance
 * @param uids - Array of UIDs of the users to delete
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves to a DeleteUsersResult object
 */
export function authDeleteUsers(
  adminInstance: any,
  uids: string[],
  tenantId?: string,
): Promise<auth.DeleteUsersResult> {
  return getAuth(adminInstance, tenantId).deleteUsers(uids);
}

/**
 * Create a custom token
 * @param adminInstance - Admin SDK instance
 * @param uid - UID of user for which the custom token will be generated
 * @param customClaims - Optional custom claims to include in the token
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with a custom Firebase Auth token
 */
export function authCreateCustomToken(
  adminInstance: any,
  uid: string,
  customClaims?: object,
  tenantId?: string,
): Promise<string> {
  // Use custom claims or default to { isTesting: true }
  const userCustomClaims = customClaims || {
    isTesting: true,
  };

  // Create auth token
  return getAuth(adminInstance, tenantId).createCustomToken(
    uid,
    userCustomClaims,
  );
}

/**
 * Create a session cookie
 * @param adminInstance - Admin SDK instance
 * @param idToken - Firebase ID token
 * @param sessionCookieOptions - Session cookie options
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with a session cookie
 */
export function authCreateSessionCookie(
  adminInstance: any,
  idToken: string,
  sessionCookieOptions: auth.SessionCookieOptions,
  tenantId?: string,
): Promise<string> {
  return getAuth(adminInstance, tenantId).createSessionCookie(
    idToken,
    sessionCookieOptions,
  );
}

/**
 * Verify a Firebase ID token
 * @param adminInstance - Admin SDK instance
 * @param idToken - Firebase ID token
 * @param checkRevoked - Whether to check if the token is revoked
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with a decoded ID token
 */
export function authVerifyIdToken(
  adminInstance: any,
  idToken: string,
  checkRevoked?: boolean,
  tenantId?: string,
): Promise<auth.DecodedIdToken> {
  return getAuth(adminInstance, tenantId).verifyIdToken(idToken, checkRevoked);
}

/**
 * Revoke all refresh tokens for a user
 * @param adminInstance - Admin SDK instance
 * @param uid - UID of the user for which to revoke tokens
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves when the operation completes
 */
export function authRevokeRefreshTokens(
  adminInstance: any,
  uid: string,
  tenantId?: string,
): Promise<void> {
  return getAuth(adminInstance, tenantId).revokeRefreshTokens(uid);
}

/**
 * Generate an email verification link
 * @param adminInstance - Admin SDK instance
 * @param email - Email of the user
 * @param actionCodeSettings - Action code settings
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with the email verification link
 */
export function authGenerateEmailVerificationLink(
  adminInstance: any,
  email: string,
  actionCodeSettings?: auth.ActionCodeSettings,
  tenantId?: string,
): Promise<string> {
  return getAuth(adminInstance, tenantId).generateEmailVerificationLink(
    email,
    actionCodeSettings,
  );
}

/**
 * Generate a password reset link
 * @param adminInstance - Admin SDK instance
 * @param email - Email of the user
 * @param actionCodeSettings - Action code settings
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with the password reset link
 */
export function authGeneratePasswordResetLink(
  adminInstance: any,
  email: string,
  actionCodeSettings?: auth.ActionCodeSettings,
  tenantId?: string,
): Promise<string> {
  return getAuth(adminInstance, tenantId).generatePasswordResetLink(
    email,
    actionCodeSettings,
  );
}

/**
 * Generate a sign-in with email link
 * @param adminInstance - Admin SDK instance
 * @param email - Email of the user
 * @param actionCodeSettings - Action code settings
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with the sign-in with email link
 */
export function authGenerateSignInWithEmailLink(
  adminInstance: any,
  email: string,
  actionCodeSettings: auth.ActionCodeSettings,
  tenantId?: string,
): Promise<string> {
  return getAuth(adminInstance, tenantId).generateSignInWithEmailLink(
    email,
    actionCodeSettings,
  );
}

/**
 * Generate a link for email verification and email change
 * @param adminInstance - Admin SDK instance
 * @param email - Email of the user
 * @param newEmail - New email of the user
 * @param actionCodeSettings - Action code settings
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with the email verification link
 */
export function authGenerateVerifyAndChangeEmailLink(
  adminInstance: any,
  email: string,
  newEmail: string,
  actionCodeSettings?: auth.ActionCodeSettings,
  tenantId?: string,
): Promise<string> {
  return getAuth(adminInstance, tenantId).generateVerifyAndChangeEmailLink(
    email,
    newEmail,
    actionCodeSettings,
  );
}

/**
 * Create a provider configuration
 * @param adminInstance - Admin SDK instance
 * @param providerConfig - The provider configuration
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with the provider configuration
 */
export function authCreateProviderConfig(
  adminInstance: any,
  providerConfig: auth.AuthProviderConfig,
  tenantId?: string,
): Promise<auth.AuthProviderConfig> {
  return getAuth(adminInstance, tenantId).createProviderConfig(providerConfig);
}

/**
 * Get a provider configuration
 * @param adminInstance - Admin SDK instance
 * @param providerId - The provider ID
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with the provider configuration
 */
export function authGetProviderConfig(
  adminInstance: any,
  providerId: string,
  tenantId?: string,
): Promise<auth.AuthProviderConfig> {
  return getAuth(adminInstance, tenantId).getProviderConfig(providerId);
}

/**
 * List provider configurations
 * @param adminInstance - Admin SDK instance
 * @param providerFilter - The provider filter
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with the provider configurations
 */
export function authListProviderConfigs(
  adminInstance: any,
  providerFilter: auth.AuthProviderConfigFilter,
  tenantId?: string,
): Promise<auth.ListProviderConfigResults> {
  return getAuth(adminInstance, tenantId).listProviderConfigs(providerFilter);
}

/**
 * Update a provider configuration
 * @param adminInstance - Admin SDK instance
 * @param providerId - The provider ID
 * @param providerConfig - The provider configuration
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves with the provider configuration
 */
export function authUpdateProviderConfig(
  adminInstance: any,
  providerId: string,
  providerConfig: auth.AuthProviderConfig,
  tenantId?: string,
): Promise<auth.AuthProviderConfig> {
  return getAuth(adminInstance, tenantId).updateProviderConfig(
    providerId,
    providerConfig,
  );
}

/**
 * Delete a provider configuration
 * @param adminInstance - Admin SDK instance
 * @param providerId - The provider ID
 * @param tenantId - Optional ID of tenant used for multi-tenancy
 * @returns Promise which resolves to null when the operation completes
 */
export function authDeleteProviderConfig(
  adminInstance: any,
  providerId: string,
  tenantId?: string,
): Promise<null> {
  return getAuth(adminInstance, tenantId)
    .deleteProviderConfig(providerId)
    .then(() => null);
}

/**
 * Object containing all tasks created by the plugin
 */
const tasks = {
  callRtdb,
  callFirestore,
  authCreateUser,
  authImportUsers,
  authListUsers,
  authGetUser,
  authGetUserByEmail,
  authGetUserByPhoneNumber,
  authGetUserByProviderUid,
  authGetUsers,
  authUpdateUser,
  authSetCustomUserClaims,
  authDeleteUser,
  authDeleteUsers,
  authCreateCustomToken,
  authCreateSessionCookie,
  authVerifyIdToken,
  authRevokeRefreshTokens,
  authGenerateEmailVerificationLink,
  authGeneratePasswordResetLink,
  authGenerateSignInWithEmailLink,
  authGenerateVerifyAndChangeEmailLink,
  authCreateProviderConfig,
  authGetProviderConfig,
  authListProviderConfigs,
  authUpdateProviderConfig,
  authDeleteProviderConfig,
};
/**
 * Type of all the names of tasks created by the plugin
 */
export type TaskName = keyof typeof tasks;

/**
 * Given a tuple, return a tuple with the first element dropped
 */
type DropFirstElem<T extends any[]> = T extends [any, ...infer U] ? U : never;
/**
 * Given a task name, return the parameters of the task
 */
export type TaskNameToParams<TN extends TaskName> = DropFirstElem<
  Parameters<(typeof tasks)[TN]>
>;
/**
 * Given a task name, return the return type of the task
 */
export type TaskNameToReturn<TN extends TaskName> = ReturnType<
  (typeof tasks)[TN]
>;

/**
 * Object mapping task names to their settings keys
 */
export const taskSettingKeys = {
  callRtdb: ['action', 'path', 'options', 'data'],
  callFirestore: ['action', 'path', 'options', 'data'],
  authCreateUser: ['properties', 'tenantId'],
  authImportUsers: ['usersImport', 'importOptions', 'tenantId'],
  authListUsers: ['maxResults', 'pageToken', 'tenantId'],
  authGetUser: ['uid', 'tenantId'],
  authGetUserByEmail: ['email', 'tenantId'],
  authGetUserByPhoneNumber: ['phoneNumber', 'tenantId'],
  authGetUserByProviderUid: ['providerId', 'uid', 'tenantId'],
  authGetUsers: ['identifiers', 'tenantId'],
  authUpdateUser: ['uid', 'properties', 'tenantId'],
  authSetCustomUserClaims: ['uid', 'customClaims', 'tenantId'],
  authDeleteUser: ['uid', 'tenantId'],
  authDeleteUsers: ['uids', 'tenantId'],
  authCreateCustomToken: ['uid', 'customClaims', 'tenantId'],
  authCreateSessionCookie: ['idToken', 'sessionCookieOptions', 'tenantId'],
  authVerifyIdToken: ['idToken', 'checkRevoked', 'tenantId'],
  authRevokeRefreshTokens: ['uid', 'tenantId'],
  authGenerateEmailVerificationLink: [
    'email',
    'actionCodeSettings',
    'tenantId',
  ],
  authGeneratePasswordResetLink: ['email', 'actionCodeSettings', 'tenantId'],
  authGenerateSignInWithEmailLink: ['email', 'actionCodeSettings', 'tenantId'],
  authGenerateVerifyAndChangeEmailLink: [
    'email',
    'newEmail',
    'actionCodeSettings',
    'tenantId',
  ],
  authCreateProviderConfig: ['providerConfig', 'tenantId'],
  authGetProviderConfig: ['providerId', 'tenantId'],
  authListProviderConfigs: ['providerFilter', 'tenantId'],
  authUpdateProviderConfig: ['providerId', 'providerConfig', 'tenantId'],
  authDeleteProviderConfig: ['providerId', 'tenantId'],
} as const satisfies { [TN in TaskName]: readonly string[] };

/**
 * Given a task name, return the settings for the task
 */
type TaskNameToSettings<TN extends TaskName> = [
  (typeof taskSettingKeys)[TN],
  TaskNameToParams<TN>,
  // make shorthands for the settings keys and params of the task
] extends [infer TNK, infer TNP]
  ? {
      // get only the indexes and not other array properties
      [I in Extract<
        keyof TNK,
        `${number}`
        // only those keys that do not have undefined as a value and thus are required
        // @ts-expect-error - TS cannot know that the amount of params coincides with the amount of taskSettingKeys
      > as undefined extends TNP[I] ? never : TNK[I]]: TNP[I];
    } & {
      // get only the indexes and not other array properties
      [I in Extract<
        keyof TNK,
        `${number}`
        // only those keys that do have undefined as a value and thus are optional
        // @ts-expect-error - TS cannot know that the amount of params coincides with the amount of taskSettingKeys
      > as undefined extends TNP[I] ? TNK[I] : never]?: TNP[I];
    }
  : never;

/**
 * A drop-in replacement for cy.task that provides type safe tasks
 * @param cy - The Cypress object
 * @param taskName - The name of the task
 * @param taskSettings - The settings for the task
 * @returns - A Cypress Chainable with the return type of the task
 */
export function typedTask<TN extends TaskName>(
  cy: AttachCustomCommandParams['cy'],
  taskName: TN,
  taskSettings: TaskNameToSettings<TN>,
): Cypress.Chainable<Awaited<TaskNameToReturn<TN>>> {
  return cy.task(taskName, taskSettings);
}

export default tasks;
