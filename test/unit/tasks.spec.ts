import { expect } from 'chai';
import * as firebase from '@firebase/testing';
import * as admin from 'firebase-admin';
import sinon from 'sinon';
import * as tasks from '../../src/tasks';

const PROJECTS_COLLECTION = 'projects';
const PROJECT_ID = 'project-1';
const PROJECT_PATH = `${PROJECTS_COLLECTION}/${PROJECT_ID}`;
const testProject = { name: 'project 1' };

const adminApp: any = firebase.initializeAdminApp({
  projectId: process.env.GCLOUD_PROJECT,
  databaseName: process.env.GCLOUD_PROJECT,
});

const projectsFirestoreRef = adminApp
  .firestore()
  .collection(PROJECTS_COLLECTION);
const projectFirestoreRef = adminApp.firestore().doc(PROJECT_PATH);

describe('tasks', () => {
  after(async () => {
    // Cleanup all apps (keeps active listeners from preventing JS from exiting)
    await Promise.all(firebase.apps().map((app) => app.delete()));
  });

  describe('callFirestore', () => {
    before(async () => {
      await firebase.clearFirestoreData({
        projectId: 'test-project',
      });
    });

    it('is exported', () => {
      expect(tasks).to.have.property('callFirestore');
      expect(tasks.callFirestore).to.be.a('function');
    });

    it('returns a promise', () => {
      expect(tasks.callFirestore(adminApp, 'get', 'some/path').then).to.be.a(
        'function',
      );
    });

    describe('get action', () => {
      it('gets collections', async () => {
        await projectFirestoreRef.set(testProject);
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
        );
        expect(result).to.be.an('array');
        expect(result[0]).to.have.property('name', testProject.name);
      });

      it('returns null for an empty collection', async () => {
        await projectFirestoreRef.set(testProject);
        const result = await tasks.callFirestore(adminApp, 'get', 'asdf');
        expect(result).to.equal(null);
      });

      it('gets a document', async () => {
        await projectFirestoreRef.set(testProject);
        const result = await tasks.callFirestore(adminApp, 'get', PROJECT_PATH);
        expect(result).to.be.an('object');
        expect(result).to.have.property('name', testProject.name);
      });

      it('returns null for an empty doc', async () => {
        const result = await tasks.callFirestore(adminApp, 'get', 'some/doc');
        expect(result).to.equal(null);
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
        expect(result[0]).to.have.property('id', secondProjectId);
        expect(result[0]).to.have.property('name', secondProject.name);
      });

      it('supports multi-where', async () => {
        await projectFirestoreRef.set(testProject);
        const secondProjectId = 'some';
        const secondProject = { name: 'another', status: 'asdf' };
        await projectsFirestoreRef.doc(secondProjectId).set(secondProject);
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
          {
            where: [
              ['name', '==', secondProject.name],
              ['status', '==', secondProject.status],
            ],
          },
        );
        expect(result[0]).to.have.property('id', secondProjectId);
        expect(result[0]).to.have.property('name', secondProject.name);
        expect(result[0]).to.have.property('status', secondProject.status);
      });

      it('supports limitToLast', async () => {
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
        expect(result).to.have.length(1);
        expect(result[0]).to.have.property('name', testProject.name);
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
        expect(result).to.have.length(1);
        expect(result[0]).to.have.property('name', testProject.name);
      });

      it('supports orderBy', async function () {
        this.retries(3);
        const secondProject = { name: 'aaaa' };
        await projectsFirestoreRef.add({ name: 'zzzzz' });
        await projectsFirestoreRef.add(secondProject);
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
          {
            orderBy: 'name',
          },
        );
        expect(result).to.be.an('array');
        expect(result[0]).to.have.property('name', secondProject.name);
      });

      it('supports orderBy with direction', async function () {
        this.retries(3);
        await projectFirestoreRef.set(testProject);
        const secondProjectId = 'some';
        const secondProject = { name: 'zzzzz' };
        await projectsFirestoreRef.doc(secondProjectId).set(secondProject);
        const result = await tasks.callFirestore(
          adminApp,
          'get',
          PROJECTS_COLLECTION,
          {
            orderBy: ['name', 'desc'],
          },
        );
        expect(result).to.be.an('array');
        expect(result[0]).to.have.property('id', secondProjectId);
        expect(result[0]).to.have.property('name', secondProject.name);
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
        expect(resultSnap.data()).to.have.property('name', testProject.name);
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
        expect(result).to.have.property('name', testProject.name);
        expect(result).to.have.property('some', extraVal.some);
      });

      describe('with timestamps', () => {
        let stub: sinon.SinonStub;
        const correctTimestamp = {
          _seconds: 1589651645,
          _nanoseconds: 434000000,
        };
        beforeEach(() => {
          stub = sinon
            .stub(admin.firestore.FieldValue, 'serverTimestamp')
            .returns(correctTimestamp as any);
        });
        afterEach(() => {
          stub.restore();
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
          expect(resultSnap.data()).to.deep.equal({
            timeProperty: correctTimestamp,
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
          expect(resultSnap.data()).to.deep.equal({
            time: { nested: correctTimestamp },
          });
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
        expect(resultSnap.data()).to.have.property('some', testValue);
      });

      describe('with timestamps', () => {
        let stub: sinon.SinonStub;
        const correctTimestamp = {
          _seconds: 1589651645,
          _nanoseconds: 434000000,
        };
        beforeEach(() => {
          stub = sinon
            .stub(admin.firestore.FieldValue, 'serverTimestamp')
            .returns(correctTimestamp as any);
        });
        afterEach(() => {
          stub.restore();
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
          /* eslint-disable no-underscore-dangle */
          expect(resultSnap.data()).to.have.nested.property(
            'timeProperty._seconds',
            correctTimestamp._seconds,
          );
          expect(resultSnap.data()).to.have.nested.property(
            'timeProperty._nanoseconds',
            correctTimestamp._nanoseconds,
          );
          /* eslint-enable no-underscore-dangle */
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
            { time: { nested: stringifiedServerTimestamp } },
          );

          const resultSnap = await projectFirestoreRef.get();
          /* eslint-disable no-underscore-dangle */
          expect(resultSnap.data()).to.have.nested.property(
            'time.nested._seconds',
            correctTimestamp._seconds,
          );
          expect(resultSnap.data()).to.have.nested.property(
            'time.nested._nanoseconds',
            correctTimestamp._nanoseconds,
          );
          /* eslint-enable no-underscore-dangle */
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
        expect(result.size).to.equal(0);
      });

      it('deletes a document', async () => {
        // Add a project document
        await projectFirestoreRef.set(testProject);
        // Run delete on project document
        await tasks.callFirestore(adminApp, 'delete', PROJECT_PATH);
        // Run delete on collection
        const result = await projectFirestoreRef.get();
        // Confirm project is deleted
        expect(result.data()).to.be.undefined;
      });
    });
  });

  describe('callRtdb', () => {
    describe('get action', () => {
      it('gets a list of objects', async () => {
        await adminApp.database().ref(PROJECT_PATH).set(testProject);
        const result = await tasks.callRtdb(adminApp, 'get', 'projects');
        expect(result).to.be.an('object');
        expect(result).to.have.nested.property(
          `${PROJECT_ID}.name`,
          testProject.name,
        );
      });

      it('returns null for an empty top level path', async () => {
        const result = await tasks.callRtdb(adminApp, 'get', 'asdf');
        expect(result).to.equal(null);
      });

      it('gets a single object value', async () => {
        await adminApp.database().ref(PROJECT_PATH).set(testProject);
        const result = await tasks.callRtdb(adminApp, 'get', PROJECT_PATH);
        expect(result).to.have.property('name', testProject.name);
      });

      it('returns null for an empty deeper path', async () => {
        const result = await tasks.callRtdb(adminApp, 'get', 'some/doc');
        expect(result).to.equal(null);
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
        expect(result).to.be.an('object');
        expect(result).to.have.keys(PROJECT_ID);
        expect(result).to.have.nested.property(
          `${PROJECT_ID}.name`,
          testProject.name,
        );
      });
    });

    describe('set action', () => {
      it('sets an object', async () => {
        await tasks.callRtdb(adminApp, 'set', PROJECT_PATH, {}, testProject);
        const result = await adminApp
          .database()
          .ref(PROJECT_PATH)
          .once('value');
        expect(result.val()).to.be.an('object');
        expect(result.val()).to.have.property('name', testProject.name);
      });

      it('sets a boolean value', async () => {
        await tasks.callRtdb(adminApp, 'set', `${PROJECT_PATH}/some`, {}, true);
        const result = await adminApp
          .database()
          .ref(`${PROJECT_PATH}/some`)
          .once('value');
        expect(result.val()).to.equal(true);
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
        expect(result.val()).to.equal(testString);
      });
    });
  });
});
