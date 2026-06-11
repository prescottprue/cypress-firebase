import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as admin from 'firebase-admin';
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
const adminApp = admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT,
  databaseURL: `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=${process.env.GCLOUD_PROJECT}`,
  credential: admin.credential.applicationDefault(),
});

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
    await adminApp.delete();
    await testEnv.cleanup();

    // Cleanup only this tests's instance of firebase-admin app
    await Promise.all(admin.apps.map((app) => app?.delete()));
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
        await projectsFirestoreRef
          .doc(projectId)
          .set({ dateField: admin.firestore.Timestamp.fromDate(currentDate) });
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
          {
            statics: { Timestamp: admin.firestore.Timestamp } as any,
            where: [
              'dateField',
              '==',
              admin.firestore.Timestamp.fromDate(currentDate),
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
        await projectsFirestoreRef
          .doc(projectId)
          .set({ [fieldName]: admin.firestore.Timestamp.fromDate(pastDate) });
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
          {
            statics: { Timestamp: admin.firestore.Timestamp } as any,
            where: [
              [
                fieldName,
                '>=',
                admin.firestore.Timestamp.fromDate(new Date('1/1/21')),
              ],
              [fieldName, '<=', admin.firestore.Timestamp.fromDate(new Date())],
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
            admin.firestore.FieldValue,
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
            { statics: admin.firestore },
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
            { statics: admin.firestore },
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
            { statics: admin.firestore },
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
            { statics: admin.firestore },
            {
              geoPointProperty: { latitude: 32.323443, longitude: 122.3954238 },
            },
          );

          const resultSnap = await projectFirestoreRef.get();
          expect(resultSnap.get('geoPointProperty')).toBeInstanceOf(
            admin.firestore.GeoPoint,
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
          { statics: admin.firestore, merge: true },
          { some: legacyStringifiedFieldDelete },
        );
        await tasks.callFirestore(
          adminApp,
          'update',
          PROJECT_PATH,
          { statics: admin.firestore, merge: true },
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
          { statics: admin.firestore, merge: true },
          { top: { second: { some: stringifiedFieldDelete } } },
        );
        const resultSnap = await projectFirestoreRef.get();
        expect(resultSnap.data()).not.toHaveProperty('top.second.some');
        expect(resultSnap.data()).toHaveProperty(
          'top.second.keep',
          originalDoc.top.second.keep,
        );
      });

      describe('with timestamps', () => {
        const correctTimestamp = {
          _seconds: 1589651645,
          _nanoseconds: 434000000,
        };
        beforeEach(() => {
          vi.spyOn(
            admin.firestore.FieldValue,
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
            { statics: admin.firestore },
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
            { statics: admin.firestore },
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
