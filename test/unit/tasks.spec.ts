import { expect } from 'chai';
import * as firebase from '@firebase/testing';
import * as admin from 'firebase-admin';
import * as tasks from '../../src/tasks';

// const app = firebase.initializeTestApp({
//   projectId: 'test',
//   auth: { uid: 'alice', email: 'alice@example.com' },
// });
const PROJECTS_COLLECTION = 'projects';
const PROJECT_ID = 'project-1';
const PROJECT_PATH = `${PROJECTS_COLLECTION}/${PROJECT_ID}`;
const testProject = { name: 'project 1' };

const projectsFirestoreRef = admin.firestore().collection(PROJECTS_COLLECTION);
const projectFirestoreRef = admin.firestore().doc(PROJECT_PATH);

describe('tasks', () => {
  describe('callFirestore', () => {
    beforeEach(() => {
      firebase.clearFirestoreData({
        projectId: 'test-project',
      });
    });

    it('is exported', () => {
      expect(tasks).to.have.property('callFirestore');
      expect(tasks.callFirestore).to.be.a('function');
    });

    it('returns a promise', () => {
      expect(tasks.callFirestore(admin, 'get', 'some/path').then).to.be.a(
        'function',
      );
    });

    describe('get action', () => {
      it('gets collections', async () => {
        await projectFirestoreRef.set(testProject);
        const result = await tasks.callFirestore(
          admin,
          'get',
          PROJECTS_COLLECTION,
        );
        expect(result).to.be.an('array');
        expect(result[0]).to.have.property('name', testProject.name);
      });

      it('returns null for an empty collection', async () => {
        await projectFirestoreRef.set(testProject);
        const result = await tasks.callFirestore(admin, 'get', 'asdf');
        expect(result).to.equal(null);
      });

      it('gets a document', async () => {
        await projectFirestoreRef.set(testProject);
        const result = await tasks.callFirestore(admin, 'get', PROJECT_PATH);
        expect(result).to.have.property('name', testProject.name);
      });

      it('returns null for an empty doc', async () => {
        const result = await tasks.callFirestore(admin, 'get', 'some/doc');
        expect(result).to.equal(null);
      });

      it('supports where', async () => {
        await projectFirestoreRef.set(testProject);
        const secondProjectId = 'some';
        const secondProject = { name: 'another' };
        await projectsFirestoreRef.doc(secondProjectId).set(secondProject);
        const result = await tasks.callFirestore(
          admin,
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
          admin,
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
          admin,
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
          admin,
          'get',
          PROJECTS_COLLECTION,
          {
            limit: 1,
          },
        );
        expect(result).to.have.length(1);
        expect(result[0]).to.have.property('name', testProject.name);
      });

      it('supports orderBy', async () => {
        await projectsFirestoreRef.add(testProject);
        const secondProjectId = 'some';
        const secondProject = { name: 'aaaa' };
        await projectsFirestoreRef.doc(secondProjectId).set(secondProject);
        await projectsFirestoreRef.add({ name: 'zzzz' });
        const result = await tasks.callFirestore(
          admin,
          'get',
          PROJECTS_COLLECTION,
          {
            orderBy: 'name',
          },
        );
        expect(result).to.have.length(3);
        expect(result[0]).to.have.property('name', secondProject.name);
      });

      it('supports orderBy with direction', async () => {
        await projectFirestoreRef.set(testProject);
        const secondProjectId = 'some';
        const secondProject = { name: 'aaaa' };
        await projectsFirestoreRef.doc(secondProjectId).set(secondProject);
        const result = await tasks.callFirestore(
          admin,
          'get',
          PROJECTS_COLLECTION,
          {
            orderBy: ['name', 'desc'],
          },
        );
        expect(result).to.have.length(2);
        expect(result[0]).to.have.property('name', testProject.name);
      });
    });

    describe('set action', () => {
      it('sets a document', async () => {
        await tasks.callFirestore(admin, 'set', PROJECT_PATH, {}, testProject);
        const resultSnap = await projectFirestoreRef.get();
        expect(resultSnap.data()).to.have.property('name', testProject.name);
      });
    });

    describe('update action', () => {
      it('updates a document', async () => {
        const testValue = 'updatetest';
        await projectFirestoreRef.set(testProject);
        await tasks.callFirestore(
          admin,
          'update',
          PROJECT_PATH,
          {},
          { some: testValue },
        );
        const resultSnap = await projectFirestoreRef.get();
        expect(resultSnap.data()).to.have.property('some', testValue);
      });
    });

    describe('delete action', () => {
      it('deletes a collection', async () => {
        // Add two projects document
        await projectFirestoreRef.set(testProject);
        await projectsFirestoreRef.doc('some').set(testProject);
        // Run delete on collection
        await tasks.callFirestore(admin, 'delete', PROJECTS_COLLECTION);
        const result = await projectsFirestoreRef.get();
        // Confirm projects collection is empty
        expect(result.size).to.equal(0);
      });

      it('deletes a document', async () => {
        // Add a project document
        await projectFirestoreRef.set(testProject);
        // Run delete on project document
        await tasks.callFirestore(admin, 'delete', PROJECT_PATH);
        // Run delete on collection
        const result = await projectFirestoreRef.get();
        // Confirm project is deleted
        expect(result.data()).to.be.undefined;
      });
    });
  });

  // TODO: Switch back to async/await when the issue is fully understood
  // NOTE: Using async/await causes timeouts when using RTDB. This does not happen
  // when using only
  describe('callRtdb', () => {
    describe('get action', () => {
      it('gets a list of objects', () => {
        admin.database().ref(PROJECT_PATH).set(testProject);
        tasks.callRtdb(admin, 'get', 'projects').then((result) => {
          expect(result).to.be.an('object');
          expect(result).to.have.nested.property(
            `${PROJECT_ID}.name`,
            testProject.name,
          );
        });
      });

      it('returns null for an empty path', () => {
        tasks.callRtdb(admin, 'get', 'asdf').then((result) => {
          expect(result).to.equal(null);
        });
      });

      it('gets a single object value', () => {
        admin.database().ref(PROJECT_PATH).set(testProject);
        tasks.callRtdb(admin, 'get', PROJECT_PATH).then((result) => {
          expect(result).to.have.property('name', testProject.name);
        });
      });

      it('returns null for an empty doc', () => {
        tasks.callRtdb(admin, 'get', 'some/doc').then((result) => {
          expect(result).to.equal(null);
        });
      });
    });

    describe('set action', () => {
      it('sets an object', () => {
        tasks
          .callRtdb(admin, 'set', PROJECT_PATH, {}, testProject)
          .then(() => admin.database().ref(PROJECT_PATH).once('value'))
          .then((result) => {
            expect(result).to.be.an('object');
            expect(result).to.have.property('name', testProject.name);
          });
      });

      it('sets a boolean value', () => {
        tasks
          .callRtdb(admin, 'set', `${PROJECT_PATH}/some`, {}, true)
          .then(() =>
            admin.database().ref(`${PROJECT_PATH}/some`).once('value'),
          )
          .then((result) => {
            expect(result).to.equal(true);
          });
      });

      it('sets a string value', () => {
        const testString = 'testing';
        tasks
          .callRtdb(admin, 'set', `${PROJECT_PATH}/some`, {}, testString)
          .then(() =>
            admin.database().ref(`${PROJECT_PATH}/some`).once('value'),
          )
          .then((result) => {
            expect(result).to.equal(testString);
          });
      });
    });
  });
});
