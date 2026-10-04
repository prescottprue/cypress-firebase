import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import compat from 'firebase/compat/app';
import * as admin from 'firebase-admin';
import 'firebase/compat/firestore';
import { arrayRemove, arrayUnion, increment } from 'firebase/firestore';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { adaptModularAdmin } from '../../src/firebase-utils';
import * as tasks from '../../src/tasks';

const PROJECTS_COLLECTION = 'projects';
const PROJECT_ID = 'project-1';
const ORDER_BY_COLLECTION = 'order-by';
const PROJECT_PATH = `${PROJECTS_COLLECTION}/${PROJECT_ID}`;
const testProject = { name: 'project 1' };
/**
 * Initialize firebase-admin SDK with emulator settings for RTDB
 * Using conditional credential handling for Node.js compatibility
 */
admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT,
  databaseURL: `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=${process.env.GCLOUD_PROJECT}`,
  credential: admin.applicationDefault(),
});

// Legacy-shaped admin instance (matches what plugin.ts passes to tasks)
const adminApp = adaptModularAdmin(admin);

const projectsFirestoreRef = adminApp
  .firestore()
  .collection(PROJECTS_COLLECTION);
// Separate collection for ordering to prevent collissions with projects ref
const orderByCollectionRef = adminApp
  .firestore()
  .collection(ORDER_BY_COLLECTION);
const projectFirestoreRef = adminApp.firestore().doc(PROJECT_PATH);

describe('tasks', () => {
  let testEnv: RulesTestEnvironment;
  beforeAll(async () => {
    /**
     * Initialize firebase-admin SDK with emulator settings for RTDB
     */
    testEnv = await initializeTestEnvironment({
      projectId: process.env.GCLOUD_PROJECT,
    });
  });
  afterAll(async () => {
    // Cleanup all apps (keeps active listeners from preventing JS from exiting)
    await Promise.all(admin.getApps().map((app) => admin.deleteApp(app)));
    await testEnv.cleanup();
  });

  describe('callFirestore', () => {
    it('is exported', () => {
      expect(tasks).toHaveProperty('callFirestore');
      expect(tasks.callFirestore).toBeTypeOf('function');
    });

    it('returns a promise', () => {
      expect(tasks.callFirestore(adminApp, 'get', 'some/path').then).toBeTypeOf(
        'function',
      );
    });

    describe('get action', () => {
      it('throws an error if action path is empty string', async () => {
        await projectFirestoreRef.set(testProject);
        try {
          await tasks.callFirestore(adminApp, 'get', '');
        } catch (err) {
          expect(err).toHaveProperty(
            'message',
            'Path is required to make Firestore Reference',
          );
        }
      });

      it('gets collections', async () => {
        await projectFirestoreRef.set(testProject);
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
        );
        expect(result).toBeInstanceOf(Array);
        expect(result[0]).toHaveProperty('name', testProject.name);
      });

      it('returns null for an empty collection', async () => {
        await projectFirestoreRef.set(testProject);
        const result = await tasks.callFirestore(adminApp, 'get', 'asdf');
        expect(result).toBeNull();
      });

      it('gets a document', async () => {
        await projectFirestoreRef.set(testProject);
        const result = await tasks.callFirestore(adminApp, 'get', PROJECT_PATH);
        expect(result).toBeTypeOf('object');
        expect(result).toHaveProperty('name', testProject.name);
      });

      it('returns null for an empty doc', async () => {
        const result = await tasks.callFirestore(adminApp, 'get', 'some/doc');
        expect(result).toBeNull();
      });

      it('supports where', async () => {
        await projectFirestoreRef.set(testProject);
        const secondProjectId = 'some';
        const secondProject = { name: 'another' };
        await projectsFirestoreRef.doc(secondProjectId).set(secondProject);
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
          {
            where: ['name', '==', secondProject.name],
          },
        );
        expect(result[0]).toHaveProperty('id', secondProjectId);
        expect(result[0]).toHaveProperty('name', secondProject.name);
      });

      it('supports where with timestamp', async () => {
        const projectId = 'one-where-timestamp';
        const currentDate = new Date();
        await projectsFirestoreRef.doc(projectId).set({
          dateField: adminApp.firestore.Timestamp.fromDate(currentDate),
        });
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
          {
            statics: { Timestamp: adminApp.firestore.Timestamp } as any,
            where: [
              'dateField',
              '==',
              adminApp.firestore.Timestamp.fromDate(currentDate),
            ],
          },
        );
        expect(result[0]).toHaveProperty('id', projectId);
      });

      it('supports multiple wheres with timestamps', async () => {
        const projectId = 'multi-where-timestamp';
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 2);
        const fieldName = 'anotherField';
        await projectsFirestoreRef.doc(projectId).set({
          [fieldName]: adminApp.firestore.Timestamp.fromDate(pastDate),
        });
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
          {
            statics: { Timestamp: adminApp.firestore.Timestamp } as any,
            where: [
              [
                fieldName,
                '>=',
                adminApp.firestore.Timestamp.fromDate(new Date('1/1/21')),
              ],
              [
                fieldName,
                '<=',
                adminApp.firestore.Timestamp.fromDate(new Date()),
              ],
            ],
          },
        );
        // TODO: Come up with a more stable way to verify here - data from other tests can cause fails
        expect(result[0]).toHaveProperty('id', projectId);
      });

      it('supports multi-where', async () => {
        await projectFirestoreRef.set(testProject);
        const secondProjectId = 'some';
        const secondProject = {
          name: 'another',
          status: 'asdf',
          anotherProperty: 'ghjk',
        };
        await projectsFirestoreRef.doc(secondProjectId).set(secondProject);
        await projectsFirestoreRef.doc('confounding').set({
          name: 'another',
          status: 'asdf',
          anotherProperty: 'we-must-not-match-this',
        });
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
          {
            where: [
              ['name', '==', secondProject.name],
              ['status', '==', secondProject.status],
              ['anotherProperty', '==', secondProject.anotherProperty],
            ],
          },
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('id', secondProjectId);
        expect(result[0]).toHaveProperty('name', secondProject.name);
        expect(result[0]).toHaveProperty('status', secondProject.status);
      });

      it('supports limitToLast', async () => {
        await projectFirestoreRef.set(testProject);
        await projectsFirestoreRef.doc('another').set(testProject);
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
          {
            orderBy: 'name',
            limitToLast: 1,
          },
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', testProject.name);
      });

      it('throws an error if limitToLast is called without orderBy', async () => {
        await projectFirestoreRef.set(testProject);
        await projectsFirestoreRef.doc('another').set(testProject);
        try {
          await tasks.callFirestore(adminApp, 'get', PROJECTS_COLLECTION, {
            limitToLast: 1,
          });
        } catch (err) {
          expect(err).toHaveProperty(
            'message',
            'limitToLast() queries require specifying at least one orderBy() clause.',
          );
        }
      });

      it('supports limit', async () => {
        await projectFirestoreRef.set(testProject);
        await projectsFirestoreRef.doc('another').set(testProject);
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
          {
            limit: 1,
          },
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('name', testProject.name);
      });

      describe('orderBy', () => {
        const firstProject = { name: 'aaaa' };
        const secondProject = { name: 'zzzz' };
        beforeAll(async () => {
          await orderByCollectionRef.add(firstProject);
          await orderByCollectionRef.add(secondProject);
        });

        it('supports orderBy without direction', async () => {
          const result = await tasks.callFirestore(
            adminApp,
            'get',
            ORDER_BY_COLLECTION,
            {
              orderBy: 'name',
            },
          );
          expect(result).toBeInstanceOf(Array);
          expect(result[0]).toHaveProperty('name', firstProject.name);
        });

        it('supports orderBy with direction', async () => {
          const result = await tasks.callFirestore(
            adminApp,
            'get',
            ORDER_BY_COLLECTION,
            {
              orderBy: ['name', 'desc'],
            },
          );
          expect(result).toBeInstanceOf(Array);
          expect(result[0]).toHaveProperty('name', secondProject.name);
        });
      });
    });

    describe('set action', () => {
      it('sets a document', async () => {
        await tasks.callFirestore(
          adminApp,
          'set',
          PROJECT_PATH,
          {},
          testProject,
        );
        const resultSnap = await projectFirestoreRef.get();
        expect(resultSnap.data()).toHaveProperty('name', testProject.name);
      });

      it('sets a document with merge', async () => {
        const extraVal = { some: 'other' };
        await tasks.callFirestore(
          adminApp,
          'set',
          PROJECT_PATH,
          { merge: true },
          { ...testProject, ...extraVal },
        );
        const resultSnap = await projectFirestoreRef.get();
        const result = resultSnap.data();
        expect(result).toHaveProperty('name', testProject.name);
        expect(result).toHaveProperty('some', extraVal.some);
      });

      it('sets a document with object containing null and 0', async () => {
        const extraVal = { some: 'other', another: null, zeroField: 0 };
        await tasks.callFirestore(
          adminApp,
          'set',
          PROJECT_PATH,
          { merge: true },
          { ...testProject, ...extraVal },
        );
        const resultSnap = await projectFirestoreRef.get();
        const result = resultSnap.data();
        expect(result).toHaveProperty('name', testProject.name);
        expect(result).toHaveProperty('some', extraVal.some);
        expect(result).toHaveProperty('another', null);
        expect(result).toHaveProperty('zeroField', 0);
      });

      describe('with timestamps', () => {
        const correctTimestamp = {
          _seconds: 1589651645,
          _nanoseconds: 434000000,
        };
        beforeEach(() => {
          vi.spyOn(
            adminApp.firestore.FieldValue,
            'serverTimestamp',
          ).mockReturnValue(correctTimestamp as any);
        });
        afterEach(() => {
          vi.restoreAllMocks();
        });

        it('sets a document with a timestamp FieldValue', async () => {
          const projectFirestoreRef = adminApp.firestore().doc(PROJECT_PATH);

          // cy.task stringifies and parses the data past to it resulting in the following value
          const stringifiedServerTimestamp = {
            _methodName: 'FieldValue.serverTimestamp',
          };

          await tasks.callFirestore(
            adminApp,
            'set',
            PROJECT_PATH,
            { statics: adminApp.firestore },
            { timeProperty: stringifiedServerTimestamp },
          );

          const resultSnap = await projectFirestoreRef.get();
          expect(resultSnap.data()).toEqual({
            timeProperty: correctTimestamp,
          });
        });

        it('sets a document with a timestamp FieldValue within an array', async () => {
          const projectFirestoreRef = adminApp.firestore().doc(PROJECT_PATH);

          // cy.task stringifies and parses the data past to it resulting in the following value
          const stringifiedServerTimestamp = {
            _methodName: 'FieldValue.serverTimestamp',
          };

          await tasks.callFirestore(
            adminApp,
            'set',
            PROJECT_PATH,
            { statics: adminApp.firestore },
            { timeArrProperty: [stringifiedServerTimestamp] },
          );

          const resultSnap = await projectFirestoreRef.get();
          expect(resultSnap.data()).toEqual({
            timeArrProperty: [correctTimestamp],
          });
        });

        it('sets a document with a nested timestamp value', async () => {
          const projectFirestoreRef = adminApp.firestore().doc(PROJECT_PATH);

          // cy.task stringifies and parses the data past to it resulting in the following value
          const stringifiedServerTimestamp = {
            _methodName: 'FieldValue.serverTimestamp',
          };

          await tasks.callFirestore(
            adminApp,
            'set',
            PROJECT_PATH,
            { statics: adminApp.firestore },
            { time: { nested: stringifiedServerTimestamp } },
          );

          const resultSnap = await projectFirestoreRef.get();
          expect(resultSnap.data()).toEqual({
            time: { nested: correctTimestamp },
          });
        });
      });

      describe('with geo point', () => {
        it('sets a document with a GeoPoint', async () => {
          const projectFirestoreRef = adminApp.firestore().doc(PROJECT_PATH);

          await tasks.callFirestore(
            adminApp,
            'set',
            PROJECT_PATH,
            { statics: adminApp.firestore },
            {
              geoPointProperty: { latitude: 32.323443, longitude: 122.3954238 },
            },
          );

          const resultSnap = await projectFirestoreRef.get();
          expect(resultSnap.get('geoPointProperty')).toBeInstanceOf(
            adminApp.firestore.GeoPoint,
          );
        });

        it('sets a document with a GeoPoint at 0,0', async () => {
          const projectFirestoreRef = adminApp.firestore().doc(PROJECT_PATH);

          await tasks.callFirestore(
            adminApp,
            'set',
            PROJECT_PATH,
            { statics: adminApp.firestore },
            { geoPointProperty: { latitude: 0, longitude: 0 } },
          );

          const resultSnap = await projectFirestoreRef.get();
          const geoPoint = resultSnap.get('geoPointProperty');
          expect(geoPoint).toBeInstanceOf(adminApp.firestore.GeoPoint);
          expect(geoPoint.latitude).toBe(0);
          expect(geoPoint.longitude).toBe(0);
        });
      });

      describe('with stringified Timestamp', () => {
        it('sets a document with a Timestamp at epoch 0', async () => {
          const projectFirestoreRef = adminApp.firestore().doc(PROJECT_PATH);

          // cy.task stringifies and parses Timestamps into plain objects
          await tasks.callFirestore(
            adminApp,
            'set',
            PROJECT_PATH,
            { statics: adminApp.firestore },
            {
              epochProperty: { seconds: 0, nanoseconds: 0 },
              nested: { epochProperty: { seconds: 0, nanoseconds: 0 } },
            },
          );

          const resultSnap = await projectFirestoreRef.get();
          const timestamp = resultSnap.get('epochProperty');
          expect(timestamp).toBeInstanceOf(adminApp.firestore.Timestamp);
          expect(timestamp.toMillis()).toBe(0);
          expect(resultSnap.get('nested.epochProperty')).toBeInstanceOf(
            adminApp.firestore.Timestamp,
          );
        });
      });
    });

    describe('update action', () => {
      it('updates a document', async () => {
        const testValue = 'updatetest';
        await projectFirestoreRef.set(testProject);
        await projectsFirestoreRef.add({ some: 'other' });
        await tasks.callFirestore(
          adminApp,
          'update',
          PROJECT_PATH,
          {},
          { some: testValue },
        );
        const resultSnap = await projectFirestoreRef.get();
        expect(resultSnap.data()).toHaveProperty('some', testValue);
      });

      it('supports deleting a field from a document using deleteField', async () => {
        const originalDoc = { some: 'other', another: 'one', keep: 'asdf' };
        await projectFirestoreRef.set(originalDoc);
        // cy.task stringifies and parses the data past to it resulting in the following value
        const legacyStringifiedFieldDelete = {
          _methodName: 'FieldValue.delete',
        };
        // V9 syntax
        const stringifiedFieldDelete = {
          _methodName: 'deleteField',
        };

        await tasks.callFirestore(
          adminApp,
          'update',
          PROJECT_PATH,
          { statics: adminApp.firestore, merge: true },
          { some: legacyStringifiedFieldDelete },
        );
        await tasks.callFirestore(
          adminApp,
          'update',
          PROJECT_PATH,
          { statics: adminApp.firestore, merge: true },
          { another: stringifiedFieldDelete },
        );
        const resultSnap = await projectFirestoreRef.get();
        expect(resultSnap.data()).not.toHaveProperty('some');
        expect(resultSnap.data()).not.toHaveProperty('another');
        expect(resultSnap.data()).toHaveProperty('keep', originalDoc.keep);
      });

      it('supports deleting a nested field from a document using deleteField', async () => {
        const originalDoc = {
          top: {
            second: {
              some: 'other',
              keep: 'asdf',
            },
          },
        };
        await projectFirestoreRef.set(originalDoc);
        // cy.task stringifies and parses the data past to it resulting in the following value
        const stringifiedFieldDelete = {
          _methodName: 'deleteField',
        };

        await tasks.callFirestore(
          adminApp,
          'set',
          PROJECT_PATH,
          { statics: adminApp.firestore, merge: true },
          { top: { second: { some: stringifiedFieldDelete } } },
        );
        const resultSnap = await projectFirestoreRef.get();
        expect(resultSnap.data()).not.toHaveProperty('top.second.some');
        expect(resultSnap.data()).toHaveProperty(
          'top.second.keep',
          originalDoc.top.second.keep,
        );
      });

      describe('with FieldValue sentinels', () => {
        // cy.task stringifies and parses data, so sentinels arrive as plain objects
        const stringify = (val: any) => JSON.parse(JSON.stringify(val));

        it('supports increment', async () => {
          await projectFirestoreRef.set({ count: 1, other: 10 });
          await tasks.callFirestore(
            adminApp,
            'update',
            PROJECT_PATH,
            { statics: adminApp.firestore },
            {
              count: stringify(increment(2)),
              other: stringify(increment(-3.5)),
            },
          );
          const resultSnap = await projectFirestoreRef.get();
          expect(resultSnap.data()).toEqual({ count: 3, other: 6.5 });
        });

        it('supports arrayUnion and arrayRemove', async () => {
          await projectFirestoreRef.set({
            tags: ['a', 'b'],
            removeFrom: ['x', 'y', 'z'],
          });
          await tasks.callFirestore(
            adminApp,
            'update',
            PROJECT_PATH,
            { statics: adminApp.firestore },
            {
              tags: stringify(arrayUnion('b', 'c')),
              removeFrom: stringify(arrayRemove('x', 'z')),
            },
          );
          const resultSnap = await projectFirestoreRef.get();
          expect(resultSnap.data()).toEqual({
            tags: ['a', 'b', 'c'],
            removeFrom: ['y'],
          });
        });

        it('converts timestamps within arrayUnion elements', async () => {
          await projectFirestoreRef.set({ dates: [] });
          await tasks.callFirestore(
            adminApp,
            'update',
            PROJECT_PATH,
            { statics: adminApp.firestore },
            {
              dates: stringify(
                arrayUnion({ at: { seconds: 1589651645, nanoseconds: 0 } }),
              ),
            },
          );
          const resultSnap = await projectFirestoreRef.get();
          const [first] = resultSnap.data()?.dates ?? [];
          expect(first.at).toBeInstanceOf(adminApp.firestore.Timestamp);
          expect(first.at.seconds).toBe(1589651645);
        });

        it('supports minified operand property names (browser bundle)', async () => {
          await projectFirestoreRef.set({ count: 1, tags: ['a'] });
          await tasks.callFirestore(
            adminApp,
            'update',
            PROJECT_PATH,
            { statics: adminApp.firestore },
            {
              count: { _methodName: 'increment', ur: 4 },
              tags: { _methodName: 'arrayUnion', ar: ['b'] },
            },
          );
          const resultSnap = await projectFirestoreRef.get();
          expect(resultSnap.data()).toEqual({ count: 5, tags: ['a', 'b'] });
        });

        it('supports compat SDK sentinels', async () => {
          await projectFirestoreRef.set({ count: 1, tags: ['a'], gone: true });
          await tasks.callFirestore(
            adminApp,
            'set',
            PROJECT_PATH,
            { statics: adminApp.firestore, merge: true },
            {
              count: stringify(compat.firestore.FieldValue.increment(2)),
              tags: stringify(compat.firestore.FieldValue.arrayUnion('b')),
              gone: stringify(compat.firestore.FieldValue.delete()),
              nested: {
                tags: stringify(compat.firestore.FieldValue.arrayUnion('n')),
              },
            },
          );
          const resultSnap = await projectFirestoreRef.get();
          expect(resultSnap.data()).toEqual({
            count: 3,
            tags: ['a', 'b'],
            nested: { tags: ['n'] },
          });
        });

        it('throws a clear error when the operand is missing', async () => {
          await expect(
            tasks.callFirestore(
              adminApp,
              'set',
              PROJECT_PATH,
              { statics: adminApp.firestore },
              { count: { _methodName: 'increment' } },
            ),
          ).rejects.toThrow(
            'Unable to find the value passed to FieldValue "increment".',
          );
        });
      });

      describe('with timestamps', () => {
        const correctTimestamp = {
          _seconds: 1589651645,
          _nanoseconds: 434000000,
        };
        beforeEach(() => {
          vi.spyOn(
            adminApp.firestore.FieldValue,
            'serverTimestamp',
          ).mockReturnValue(correctTimestamp as any);
        });
        afterEach(() => {
          vi.restoreAllMocks();
        });

        it('updates a document with a timestamp FieldValue', async () => {
          const projectFirestoreRef = adminApp.firestore().doc(PROJECT_PATH);
          await projectFirestoreRef.set({ some: 'data' });
          // cy.task stringifies and parses the data past to it resulting in the following value
          const stringifiedServerTimestamp = {
            _methodName: 'FieldValue.serverTimestamp',
          };

          await tasks.callFirestore(
            adminApp,
            'update',
            PROJECT_PATH,
            { statics: adminApp.firestore },
            { timeProperty: stringifiedServerTimestamp },
          );

          const resultSnap = await projectFirestoreRef.get();
          expect(resultSnap.data()).toHaveProperty(
            'timeProperty._seconds',
            correctTimestamp._seconds,
          );
          expect(resultSnap.data()).toHaveProperty(
            'timeProperty._nanoseconds',
            correctTimestamp._nanoseconds,
          );
        });

        it('updates a document with a nested timestamp value', async () => {
          const projectFirestoreRef = adminApp.firestore().doc(PROJECT_PATH);
          await projectFirestoreRef.set({ some: 'data' });

          // cy.task stringifies and parses the data past to it resulting in the following value
          const stringifiedServerTimestamp = {
            _methodName: 'FieldValue.serverTimestamp',
          };

          await tasks.callFirestore(
            adminApp,
            'update',
            PROJECT_PATH,
            { statics: adminApp.firestore },
            {
              time: {
                nested: stringifiedServerTimestamp,
                arrayNested: [stringifiedServerTimestamp],
                mapInArrayNested: [{ nested: stringifiedServerTimestamp }],
              },
            },
          );

          const resultSnap = await projectFirestoreRef.get();
          expect(resultSnap.data()).toHaveProperty(
            'time.nested._seconds',
            correctTimestamp._seconds,
          );
          expect(resultSnap.data()).toHaveProperty(
            'time.nested._nanoseconds',
            correctTimestamp._nanoseconds,
          );
          expect(resultSnap.data()).toHaveProperty(
            'time.arrayNested[0]._seconds',
            correctTimestamp._seconds,
          );
          expect(resultSnap.data()).toHaveProperty(
            'time.arrayNested[0]._nanoseconds',
            correctTimestamp._nanoseconds,
          );
          expect(resultSnap.data()).toHaveProperty(
            'time.mapInArrayNested[0].nested._seconds',
            correctTimestamp._seconds,
          );
          expect(resultSnap.data()).toHaveProperty(
            'time.mapInArrayNested[0].nested._nanoseconds',
            correctTimestamp._nanoseconds,
          );
        });
      });
    });

    describe('delete action', () => {
      it('deletes a collection', async () => {
        // Add two projects document
        await projectFirestoreRef.set(testProject);
        await projectsFirestoreRef.doc('some').set(testProject);
        // Run delete on collection
        await tasks.callFirestore(adminApp, 'delete', PROJECTS_COLLECTION);
        const result = await projectsFirestoreRef.get();
        // Confirm projects collection is empty
        expect(result.size).toBe(0);
      });

      it('deletes documents based on a query', async () => {
        const projectToDelete = { name: 'projectToDelete' };
        const projectId = 'projectToDelete';
        const projectToDeleteRef = projectsFirestoreRef.doc(projectId);
        // Add two projects document
        await projectToDeleteRef.set(projectToDelete);
        await projectsFirestoreRef.doc('some').set(testProject);
        // Run delete on projects with name matching testProject's name
        await tasks.callFirestore(adminApp, 'delete', PROJECTS_COLLECTION, {
          where: ['name', '==', projectToDelete.name],
        });
        const result = await projectToDeleteRef.get();
        // Confirm projects collection is empty
        expect(result).toHaveProperty('exists', false);
      });

      it('deletes a document', async () => {
        // Add a project document
        await projectFirestoreRef.set(testProject);
        // Run delete on project document
        await tasks.callFirestore(adminApp, 'delete', PROJECT_PATH);
        // Run delete on collection
        const result = await projectFirestoreRef.get();
        // Confirm project is deleted
        expect(result.data()).toBeUndefined();
      });
    });

    describe('delete action with recursive option', () => {
      const RECURSIVE_COLLECTION = 'recursive-delete';
      const recursiveRef = adminApp
        .firestore()
        .collection(RECURSIVE_COLLECTION);
      afterEach(async () => {
        await adminApp.firestore().recursiveDelete(recursiveRef);
      });

      it('leaves subcollections when deleting a document by default', async () => {
        await recursiveRef.doc('a').set({ name: 'a' });
        await recursiveRef.doc('a').collection('sub').doc('x').set({ n: 1 });
        await tasks.callFirestore(
          adminApp,
          'delete',
          `${RECURSIVE_COLLECTION}/a`,
        );
        const subSnap = await recursiveRef.doc('a').collection('sub').get();
        expect(subSnap.size).toBe(1);
      });

      it('deletes a document and its subcollections', async () => {
        await recursiveRef.doc('a').set({ name: 'a' });
        await recursiveRef.doc('a').collection('sub').doc('x').set({ n: 1 });
        await recursiveRef.doc('b').set({ name: 'b' });
        await tasks.callFirestore(
          adminApp,
          'delete',
          `${RECURSIVE_COLLECTION}/a`,
          { recursive: true },
        );
        const subSnap = await recursiveRef.doc('a').collection('sub').get();
        expect(subSnap.size).toBe(0);
        expect((await recursiveRef.doc('a').get()).exists).toBe(false);
        expect((await recursiveRef.doc('b').get()).exists).toBe(true);
      });

      it('deletes a collection and its subcollections', async () => {
        await recursiveRef.doc('a').set({ name: 'a' });
        await recursiveRef.doc('a').collection('sub').doc('x').set({ n: 1 });
        await tasks.callFirestore(adminApp, 'delete', RECURSIVE_COLLECTION, {
          recursive: true,
        });
        expect((await recursiveRef.get()).size).toBe(0);
        const subSnap = await recursiveRef.doc('a').collection('sub').get();
        expect(subSnap.size).toBe(0);
      });

      it('deletes only documents matching a query and their subcollections', async () => {
        await recursiveRef.doc('a').set({ name: 'a', remove: true });
        await recursiveRef.doc('a').collection('sub').doc('x').set({ n: 1 });
        await recursiveRef.doc('b').set({ name: 'b', remove: false });
        await recursiveRef.doc('b').collection('sub').doc('y').set({ n: 2 });
        await tasks.callFirestore(adminApp, 'delete', RECURSIVE_COLLECTION, {
          recursive: true,
          where: ['remove', '==', true],
        });
        expect((await recursiveRef.doc('a').get()).exists).toBe(false);
        expect((await recursiveRef.doc('a').collection('sub').get()).size).toBe(
          0,
        );
        expect((await recursiveRef.doc('b').get()).exists).toBe(true);
        expect((await recursiveRef.doc('b').collection('sub').get()).size).toBe(
          1,
        );
      });
    });

    describe('create action', () => {
      const createPath = 'create-action/doc';
      afterEach(async () => {
        await adminApp.firestore().doc(createPath).delete();
      });

      it('creates a document which does not exist', async () => {
        await tasks.callFirestore(
          adminApp,
          'create',
          createPath,
          {},
          {
            name: 'created',
            at: { seconds: 1589651645, nanoseconds: 0 },
          },
        );
        const snap = await adminApp.firestore().doc(createPath).get();
        expect(snap.get('name')).toBe('created');
        expect(snap.get('at')).toBeInstanceOf(adminApp.firestore.Timestamp);
      });

      it('fails if the document already exists', async () => {
        await adminApp.firestore().doc(createPath).set({ name: 'existing' });
        await expect(
          tasks.callFirestore(
            adminApp,
            'create',
            createPath,
            {},
            {
              name: 'created',
            },
          ),
        ).rejects.toThrow(/already exists/i);
        const snap = await adminApp.firestore().doc(createPath).get();
        expect(snap.get('name')).toBe('existing');
      });

      it('throws for a collection path', async () => {
        await expect(
          tasks.callFirestore(
            adminApp,
            'create',
            'create-action',
            {},
            {
              name: 'created',
            },
          ),
        ).rejects.toThrow('The create action requires a document path.');
      });
    });

    describe('count and aggregate actions', () => {
      const ORDERS_COLLECTION = 'aggregate-orders';
      const ordersRef = adminApp.firestore().collection(ORDERS_COLLECTION);
      beforeEach(async () => {
        await ordersRef.doc('a').set({ price: 10, status: 'paid' });
        await ordersRef.doc('b').set({ price: 20, status: 'paid' });
        await ordersRef.doc('c').set({ price: 5, status: 'open' });
      });
      afterEach(async () => {
        await adminApp.firestore().recursiveDelete(ordersRef);
      });

      it('counts documents in a collection', async () => {
        const result = await tasks.callFirestore(
          adminApp,
          'count',
          ORDERS_COLLECTION,
        );
        expect(result).toBe(3);
      });

      it('counts documents matching a query', async () => {
        const result = await tasks.callFirestore(
          adminApp,
          'count',
          ORDERS_COLLECTION,
          { where: ['status', '==', 'paid'] },
        );
        expect(result).toBe(2);
      });

      it('returns 0 for an empty collection', async () => {
        const result = await tasks.callFirestore(
          adminApp,
          'count',
          'aggregate-empty',
        );
        expect(result).toBe(0);
      });

      it('runs count, sum and average aggregations', async () => {
        const result = await tasks.callFirestore(
          adminApp,
          'aggregate',
          ORDERS_COLLECTION,
          {
            where: ['status', '==', 'paid'],
            aggregate: {
              count: ['count'],
              total: ['sum', 'price'],
              average: ['average', 'price'],
            },
          },
        );
        expect(result).toEqual({ count: 2, total: 30, average: 15 });
      });

      it('throws when aggregations are missing', async () => {
        await expect(
          tasks.callFirestore(adminApp, 'aggregate', ORDERS_COLLECTION),
        ).rejects.toThrow('You must provide options.aggregate');
      });

      it('throws for an unsupported aggregation', async () => {
        await expect(
          tasks.callFirestore(adminApp, 'aggregate', ORDERS_COLLECTION, {
            aggregate: { max: ['max', 'price'] as any },
          }),
        ).rejects.toThrow('Unsupported aggregate type "max"');
      });

      it('throws for a document path', async () => {
        await expect(
          tasks.callFirestore(adminApp, 'count', `${ORDERS_COLLECTION}/a`),
        ).rejects.toThrow('The count action requires a collection path');
      });
    });

    describe('get action with timestampFormat option', () => {
      const timestampPath = 'timestamp-format/doc';
      const seconds = 1589651645;
      const nanoseconds = 434000000;
      beforeEach(async () => {
        const at = new adminApp.firestore.Timestamp(seconds, nanoseconds);
        await adminApp
          .firestore()
          .doc(timestampPath)
          .set({
            at,
            nested: { at, list: [at] },
            geo: new adminApp.firestore.GeoPoint(1, 2),
            name: 'x',
          });
      });
      afterEach(async () => {
        await adminApp.firestore().doc(timestampPath).delete();
      });

      it('returns Timestamps unchanged by default', async () => {
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          timestampPath,
        );
        expect(result.at).toBeInstanceOf(adminApp.firestore.Timestamp);
      });

      it('returns Timestamps as { seconds, nanoseconds } objects', async () => {
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          timestampPath,
          {
            timestampFormat: 'object',
          },
        );
        const expected = { seconds, nanoseconds };
        expect(result.at).toEqual(expected);
        expect(result.nested).toEqual({ at: expected, list: [expected] });
        expect(result.geo).toBeInstanceOf(adminApp.firestore.GeoPoint);
        expect(result.name).toBe('x');
      });

      it('returns Timestamps as ISO strings', async () => {
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          timestampPath,
          {
            timestampFormat: 'iso',
          },
        );
        expect(result.at).toBe('2020-05-16T17:54:05.434Z');
      });

      it('returns Timestamps as epoch milliseconds in collection results', async () => {
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          'timestamp-format',
          { timestampFormat: 'millis' },
        );
        expect(result[0]).toHaveProperty('at', seconds * 1000 + 434);
        expect(result[0]).toHaveProperty('id', 'doc');
      });
    });

    describe('batch action', () => {
      afterEach(async () => {
        await tasks.callFirestore(adminApp, 'delete', PROJECTS_COLLECTION);
      });

      it('runs set, add, update and delete writes relative to the base path', async () => {
        await projectsFirestoreRef.doc('toUpdate').set({ name: 'old' });
        await projectsFirestoreRef.doc('toDelete').set(testProject);
        const result = await tasks.callFirestore(
          adminApp,
          'batch',
          PROJECTS_COLLECTION,
          undefined,
          [
            { action: 'set', path: PROJECT_ID, data: testProject },
            { action: 'add', data: { name: 'added' } },
            { action: 'update', path: 'toUpdate', data: { name: 'new' } },
            { action: 'delete', path: 'toDelete' },
          ],
        );
        expect(result).toBeNull();
        expect((await projectFirestoreRef.get()).data()).toEqual(testProject);
        expect(
          (await projectsFirestoreRef.doc('toUpdate').get()).data(),
        ).toEqual({ name: 'new' });
        expect((await projectsFirestoreRef.doc('toDelete').get()).exists).toBe(
          false,
        );
        const added = await projectsFirestoreRef
          .where('name', '==', 'added')
          .get();
        expect(added.size).toBe(1);
      });

      it('supports full paths with an empty base path and set with merge', async () => {
        await projectFirestoreRef.set({ name: 'project 1', other: 'value' });
        await tasks.callFirestore(adminApp, 'batch', '', undefined, [
          {
            action: 'set',
            path: PROJECT_PATH,
            data: { name: 'merged' },
            options: { merge: true },
          },
        ]);
        expect((await projectFirestoreRef.get()).data()).toEqual({
          name: 'merged',
          other: 'value',
        });
      });

      it('commits more writes than batchSize across multiple batches', async () => {
        const operations = Array.from({ length: 12 }, (_, i) => ({
          action: 'set' as const,
          path: `doc-${i}`,
          data: { index: i },
        }));
        const batchSpy = vi.spyOn(adminApp.firestore(), 'batch');
        await tasks.callFirestore(
          adminApp,
          'batch',
          PROJECTS_COLLECTION,
          { batchSize: 5 },
          operations,
        );
        expect(batchSpy).toHaveBeenCalledTimes(3);
        batchSpy.mockRestore();
        expect((await projectsFirestoreRef.get()).size).toBe(12);
      });

      it('converts timestamps within batch data', async () => {
        await tasks.callFirestore(
          adminApp,
          'batch',
          PROJECTS_COLLECTION,
          undefined,
          [
            {
              action: 'set',
              path: PROJECT_ID,
              data: { createdAt: { seconds: 0, nanoseconds: 0 } },
            },
          ],
        );
        const data = (await projectFirestoreRef.get()).data();
        expect(data?.createdAt).toBeInstanceOf(adminApp.firestore.Timestamp);
      });

      it('throws without writing anything if an operation is invalid', async () => {
        await expect(
          tasks.callFirestore(
            adminApp,
            'batch',
            PROJECTS_COLLECTION,
            undefined,
            [
              { action: 'set', path: PROJECT_ID, data: testProject },
              { action: 'set', path: 'missingData' },
            ],
          ),
        ).rejects.toThrow(
          'You must define data to run set in batch operation 1',
        );
        expect((await projectFirestoreRef.get()).exists).toBe(false);
      });

      it('throws if operations is not an array', async () => {
        await expect(
          tasks.callFirestore(
            adminApp,
            'batch',
            PROJECTS_COLLECTION,
            undefined,
            {
              some: 'data',
            },
          ),
        ).rejects.toThrow('You must provide an array of operations');
      });
    });
  });

  describe('callRtdb', () => {
    describe('get action', () => {
      it('throws an error if actionPath is missing', async () => {
        await adminApp.database().ref(PROJECT_PATH).set(testProject);
        try {
          await tasks.callRtdb(adminApp, 'get', '');
        } catch (err) {
          expect(err).toHaveProperty(
            'message',
            'actionPath is required for callRtdb. Use "/" for top level actions.',
          );
        }
      });

      it('gets whole DB when passed "/" as action path', async () => {
        await adminApp.database().ref(PROJECT_PATH).set(testProject);
        const result = await tasks.callRtdb(adminApp, 'get', '/');
        expect(result).toBeTypeOf('object');
      });

      it('gets a list of objects', async () => {
        await adminApp.database().ref(PROJECT_PATH).set(testProject);
        const result = await tasks.callRtdb(adminApp, 'get', 'projects');
        expect(result).toBeTypeOf('object');
        expect(result).toHaveProperty(`${PROJECT_ID}.name`, testProject.name);
      });

      it('returns null for an empty top level path', async () => {
        const result = await tasks.callRtdb(adminApp, 'get', 'asdf');
        expect(result).toBeNull();
      });

      it('gets a single object value', async () => {
        await adminApp.database().ref(PROJECT_PATH).set(testProject);
        const result = await tasks.callRtdb(adminApp, 'get', PROJECT_PATH);
        expect(result).toHaveProperty('name', testProject.name);
      });

      it('returns null for an empty deeper path', async () => {
        const result = await tasks.callRtdb(adminApp, 'get', 'some/doc');
        expect(result).toBeNull();
      });

      it('supports orderByChild with equalTo', async () => {
        await adminApp.database().ref(PROJECT_PATH).set(testProject);
        const result = await tasks.callRtdb(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
          {
            orderByChild: 'name',
            equalTo: testProject.name,
          },
        );
        expect(result).toBeTypeOf('object');
        expect(Object.keys(result)).toEqual([PROJECT_ID]);
        expect(result).toHaveProperty(`${PROJECT_ID}.name`, testProject.name);
      });
    });

    describe('set action', () => {
      it('sets an object', async () => {
        await tasks.callRtdb(adminApp, 'set', PROJECT_PATH, {}, testProject);
        const result = await adminApp
          .database()
          .ref(PROJECT_PATH)
          .once('value');
        expect(result.val()).toBeTypeOf('object');
        expect(result.val()).toHaveProperty('name', testProject.name);
      });

      it('sets a boolean value', async () => {
        await tasks.callRtdb(adminApp, 'set', `${PROJECT_PATH}/some`, {}, true);
        const result = await adminApp
          .database()
          .ref(`${PROJECT_PATH}/some`)
          .once('value');
        expect(result.val()).toBe(true);
      });

      it('sets a string value', async () => {
        const testString = 'testing';
        await tasks.callRtdb(
          adminApp,
          'set',
          `${PROJECT_PATH}/some`,
          {},
          testString,
        );
        const result = await adminApp
          .database()
          .ref(`${PROJECT_PATH}/some`)
          .once('value');
        expect(result.val()).toBe(testString);
      });
    });

    describe('push action', () => {
      it('sets an object', async () => {
        const pushKey = await tasks.callRtdb(
          adminApp,
          'push',
          PROJECT_PATH,
          {},
          testProject,
        );
        const result = await adminApp
          .database()
          .ref(`${PROJECT_PATH}/${pushKey}`)
          .once('value');
        expect(result.val()).toBeTypeOf('object');
        expect(result.val()).toHaveProperty('name', testProject.name);
      });
    });
  });
});
