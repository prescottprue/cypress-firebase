import {
  FixtureData,
  FirestoreAction,
  FirestoreCommandOptions,
} from './buildFirestoreCommand';
import { RTDBAction, RTDBCommandOptions } from './buildRtdbCommand';
import { slashPathToFirestoreRef } from './firebase-utils';

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
      return null;
    })
    .catch(handleError);
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
  options?: FirestoreCommandOptions,
  data?: FixtureData,
): Promise<any> {
  if (action === 'get') {
    return (slashPathToFirestoreRef(
      adminInstance.firestore(),
      actionPath,
      options,
    ) as any)
      .get()
      .then((snap: any) => {
        if (typeof snap.docs !== 'undefined') {
          return snap.docs.map(
            (docSnap: FirebaseFirestore.DocumentSnapshot) => ({
              ...docSnap.data(),
              id: docSnap.id,
            }),
          );
        }
        return snap.data();
      })
      .catch((err: Error) => {
        /* eslint-disable no-console */
        console.error(
          `Error with Firestore "${action}" at path "${actionPath}" :`,
          err,
        );
        /* eslint-enable no-console */
        return Promise.reject(err);
      });
  }

  if (action === 'set') {
    return adminInstance
      .firestore()
      .doc(actionPath)
      [action](data, options?.merge ? { merge: options?.merge } : undefined)
      .catch((err: Error) => {
        /* eslint-disable no-console */
        console.error(
          `Error with Firestore "${action}" at path "${actionPath}" :`,
          err,
        );
        /* eslint-enable no-console */
        return Promise.reject(err);
      });
  }
  return (slashPathToFirestoreRef(
    adminInstance.firestore(),
    actionPath,
    options,
  ) as any)
    [action](data)
    .catch((err: Error) => {
      /* eslint-disable no-console */
      console.error(
        `Error with Firestore "${action}" at path "${actionPath}" :`,
        err,
      );
      /* eslint-enable no-console */
      return Promise.reject(err);
    });
}
