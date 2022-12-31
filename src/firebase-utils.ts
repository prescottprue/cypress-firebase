import type { firestore } from 'firebase-admin';
import type {
  CollectionReference,
  DocumentReference,
  Query,
  QuerySnapshot,
} from 'firebase-admin/firestore';
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
