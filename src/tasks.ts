import { FixtureData, FirestoreAction } from './buildFirestoreCommand';
import { RTDBAction, RTDBCommandOptions } from './buildRtdbCommand';
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
function optionsToRtdbRef(baseRef: any, options?: RTDBCommandOptions): any {
  let newRef = baseRef;
  const optionsToAdd = [
    'orderByChild',
    'orderByKey',
    'orderByValue',
    'equalTo',
    'limitToFirst',
    'limitToLast',
    'startAt',
    'endAt',
  ];
  optionsToAdd.forEach((optionName: string) => {
    if (options && (options as any)[optionName]) {
      newRef = newRef[optionName]((options as any)[optionName]);
    }
  });
  return newRef;
}

/**
 * @param adminInstance - firebase-admin instance
 * @param action - Action to run
 * @param actionPath - Path in RTDB
 * @param options - Query options
 * @param data - Data to pass to action
 * @returns Promsie which resolves with results of calling RTDB
 */
export function callRtdb(
  adminInstance: any,
  action: RTDBAction,
  actionPath: string,
  options?: RTDBCommandOptions,
  data?: FixtureData,
): Promise<any> {
  /**
   * @param err - Error to handle
   * @returns Promise which rejects
   */
  function handleError(err: Error): Promise<any> {
    /* eslint-disable no-console */
    console.error(`Error with RTDB "${action}" at path "${actionPath}" :`, err);
    /* eslint-enable no-console */
    return Promise.reject(err);
  }
  if (action === 'get') {
    return optionsToRtdbRef(adminInstance.database().ref(actionPath), options)
      .once('value')
      .then((snap: any): any => snap.val())
      .catch(handleError);
  }

  if (action === 'push') {
    const pushRef = adminInstance
      .database()
      .ref(actionPath)
      .push();
    return pushRef
      .set(data)
      .then(() => {
        return pushRef.key;
      })
      .catch(handleError);
  }

  return adminInstance
    .database()
    .ref(actionPath)
    [action](data)
    .then(() => {
      // Prevents Cypress error with message:
      // "You must return a promise, a value, or null to indicate that the task was handled."
      return null;
    })
    .catch(handleError);
}

/**
 * Options for building Firestore commands
 */
export interface CallFirestoreOptions {
  /**
   * Whether or not to include createdAt and createdBy
   */
  withMeta?: boolean;
  merge?: boolean;
  /*
   * Size of batch to use while deleting
   */
  batchSize?: number;
}

/**
 * @param adminInstance - firebase-admin instance
 * @param action - Action to run
 * @param actionPath - Path to collection or document within Firestore
 * @param options - Query options
 * @param data - Data to pass to action
 * @returns Promise which resolves with results of calling Firestore
 */
export function callFirestore(
  adminInstance: any,
  action: FirestoreAction,
  actionPath: string,
  options?: CallFirestoreOptions,
  data?: FixtureData,
): Promise<any> {
  /**
   * @param err - Error to handle
   * @returns Promise which rejects
   */
  function handleError(err: Error): Promise<any> {
    /* eslint-disable no-console */
    console.error(
      `Error with Firestore "${action}" at path "${actionPath}" :`,
      err,
    );
    /* eslint-enable no-console */
    return Promise.reject(err);
  }
  if (action === 'get') {
    return (slashPathToFirestoreRef(
      adminInstance.firestore(),
      actionPath,
      options,
    ) as any)
      .get()
      .then((snap: any) => {
        if (typeof snap.docs?.map === 'function') {
          return snap.docs.map(
            (docSnap: FirebaseFirestore.DocumentSnapshot) => ({
              ...docSnap.data(),
              id: docSnap.id,
            }),
          );
        }
        const dataVal = snap.data();
        // Falling back to null in the case of falsey value prevents Cypress error with message:
        // "You must return a promise, a value, or null to indicate that the task was handled."
        return dataVal || null;
      })
      .catch(handleError);
  }

  if (action === 'set') {
    return adminInstance
      .firestore()
      .doc(actionPath)
      [action](data, options?.merge ? { merge: options?.merge } : undefined)
      .catch(handleError);
  }

  if (action === 'delete') {
    // Handle deleting of collections & sub-collections if not a doc path
    const deletePromise = isDocPath(actionPath)
      ? (slashPathToFirestoreRef(
          adminInstance.firestore(),
          actionPath,
          options,
        ) as FirebaseFirestore.DocumentReference).delete()
      : deleteCollection(
          adminInstance.firestore(),
          actionPath,
          options?.batchSize,
        );
    return (
      deletePromise
        // Returning null in the case of falsey value prevents Cypress error with message:
        // "You must return a promise, a value, or null to indicate that the task was handled."
        .then(() => null)
        .catch(handleError)
    );
  }
  // "update" action
  return (slashPathToFirestoreRef(
    adminInstance.firestore(),
    actionPath,
    options,
  ) as any)
    [action](data)
    .catch(handleError);
}
