import {
  FixtureData,
  FirestoreAction,
  FirestoreCommandOptions,
} from './buildFirestoreCommand';
import { RTDBAction, RTDBCommandOptions } from './buildRtdbCommand';
import { slashPathToFirestoreRef } from './firebase-utils';

/**
 * @param adminInstance - firebase-admin instance
 * @param action - Action to run
 * @param actionPath - Path in RTDB
 * @param dataOrOptions - Data or options
 * @returns Promsie which resolves with results of calling RTDB
 */
export function callRtdb(
  adminInstance: any,
  action: RTDBAction,
  actionPath: string,
  dataOrOptions: FixtureData | RTDBCommandOptions,
): Promise<any> {
  if (action === 'get') {
    return adminInstance
      .database()
      .ref(actionPath)
      .once('value')
      .then((snap: any) => {
        return snap.val();
      })
      .catch((err: Error) => {
        /* eslint-disable no-console */
        console.error(
          `Error with RTDB "${action}" at path "${actionPath}" :`,
          err,
        );
        /* eslint-enable no-console */
        return Promise.reject(err);
      });
  }
  return (adminInstance.database().ref(actionPath) as any)
    [action](dataOrOptions)
    .catch((err: Error) => {
      /* eslint-disable no-console */
      console.error(
        `Error with RTDB "${action}" at path "${actionPath}" :`,
        err,
      );
      /* eslint-enable no-console */
      return Promise.reject(err);
    });
}

/**
 * @param adminInstance - firebase-admin instance
 * @param action - Action to run
 * @param actionPath - Path to collection or document within Firestore
 * @param dataOrOptions - Data or options
 * @returns Promise which resolves with results of calling Firestore
 */
export function callFirestore(
  adminInstance: any,
  action: FirestoreAction,
  actionPath: string,
  dataOrOptions: FixtureData | FirestoreCommandOptions,
): Promise<any> {
  if (action === 'get') {
    return (slashPathToFirestoreRef(
      adminInstance.firestore(),
      actionPath,
      dataOrOptions,
    ).get() as any)
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
  return (slashPathToFirestoreRef(
    adminInstance.firestore(),
    actionPath,
    dataOrOptions,
  ) as any)
    [action](dataOrOptions)
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
