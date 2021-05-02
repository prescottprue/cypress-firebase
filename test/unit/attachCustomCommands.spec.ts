import { expect } from 'chai';
import sinon from 'sinon';
import { attachCustomCommands } from '../../src';

let taskSpy: any;
const cy: any = { log: sinon.spy() };
const loadedCustomCommands: any = {};
const testUserId = 'TEST_USER';
let addSpy: sinon.SinonSpy;
let envSpy: sinon.SinonSpy;
let Cypress: any = {};
let currentUser: any;
let onAuthStateChanged: any;
let signInWithCustomToken: any;
const firebase = {
  auth: sinon.spy(() => ({
    currentUser,
    onAuthStateChanged,
    signInWithCustomToken,
    signOut: sinon.spy(() => Promise.resolve()),
  })),
  database: { ServerValue: { TIMESTAMP: 'TIMESTAMP' } },
  firestore: { Timestamp: { now: () => 'TIMESTAMP' } },
};

describe('attachCustomCommands', () => {
  beforeEach(() => {
    currentUser = {};
    taskSpy = sinon.spy(() => Promise.resolve());
    envSpy = sinon.spy((param) => param === 'TEST_UID' && testUserId);
    onAuthStateChanged = sinon.spy((authHandleFunc) => {
      authHandleFunc({});
    });
    signInWithCustomToken = sinon.spy(() => Promise.resolve());
    cy.task = taskSpy;
    addSpy = sinon.spy((customCommandName: string, customCommandFunc: any) => {
      loadedCustomCommands[customCommandName] = customCommandFunc;
    });
    Cypress = { Commands: { add: addSpy }, env: envSpy };
    attachCustomCommands({ cy, Cypress, firebase });
  });

  describe('cy.login', () => {
    it('Is attached as a custom command', () => {
      expect(addSpy).to.have.been.calledWith('login');
    });

    it('throws if no uid is passed or within environment', () => {
      Cypress = { Commands: { add: addSpy }, env: sinon.spy() };
      attachCustomCommands({ cy, Cypress, firebase });
      currentUser = undefined;
      try {
        loadedCustomCommands.login();
      } catch (err) {
        expect(err).to.have.property(
          'message',
          'uid must be passed or TEST_UID set within environment to login',
        );
      }
    });

    it('returns undefined if pass UID matches already logged in user', async () => {
      const uid = '123ABC';
      currentUser = { uid };
      const returnVal = await loadedCustomCommands.login(uid);
      expect(taskSpy).to.not.have.been.called;
      expect(signInWithCustomToken).to.not.have.been.called;
      expect(returnVal).to.be.undefined;
    });

    it('calls task with uid and custom claims', async () => {
      await loadedCustomCommands.login('123ABC');
      expect(taskSpy).to.have.been.calledOnce;
      expect(signInWithCustomToken).to.have.been.calledOnce;
    });
  });

  describe('cy.logout', () => {
    it('Is attached as a custom command', () => {
      expect(addSpy).to.have.been.calledWith('logout');
    });

    it('calls task', async () => {
      // Return empty auth so logout is resolved
      onAuthStateChanged = sinon.spy((authHandleFunc) => {
        authHandleFunc();
      });
      await loadedCustomCommands.logout();
      expect(onAuthStateChanged).to.have.been.calledOnce;
    });
  });

  describe('cy.callFirestore', () => {
    it('Is attached as a custom command', () => {
      expect(addSpy).to.have.been.calledWith('callFirestore');
    });

    it('calls task with get action (setting third argument as options)', async () => {
      const action = 'get';
      const actionPath = '123ABC';
      await loadedCustomCommands.callFirestore(action, actionPath);
      expect(taskSpy).to.have.been.calledWith('callFirestore', {
        action,
        path: actionPath,
        options: undefined,
      });
    });
    it('calls task with set action (setting third argument as data, and forth as options)', async () => {
      const action = 'set';
      const actionPath = '123ABC';
      const testData = { asdf: 'asdf' };
      const options = { withMeta: false };
      await loadedCustomCommands.callFirestore(
        action,
        actionPath,
        testData,
        options,
      );
      expect(taskSpy).to.have.been.calledWith('callFirestore', {
        action,
        path: actionPath,
        data: testData,
        options,
      });
    });

    it('calls task with set action including meta data if withMeta is set to true', async () => {
      const action = 'set';
      const actionPath = '123ABC';
      const testData = { asdf: 'asdf' };
      const options = { withMeta: true };
      await loadedCustomCommands.callFirestore(
        action,
        actionPath,
        testData,
        options,
      );
      expect(taskSpy).to.have.been.calledWith('callFirestore', {
        action,
        path: actionPath,
        data: { ...testData, createdBy: testUserId, createdAt: 'TIMESTAMP' },
        options,
      });
    });
  });

  describe('cy.callRtdb', () => {
    it('Is attached as a custom command', () => {
      expect(addSpy).to.have.been.calledWith('callRtdb');
    });

    it('calls task with get action (setting third argument as options)', async () => {
      const action = 'get';
      const actionPath = '123ABC';
      await loadedCustomCommands.callRtdb(action, actionPath);
      expect(taskSpy).to.have.been.calledWith('callRtdb', {
        action,
        path: actionPath,
        options: undefined,
      });
    });

    it('calls task with set action with object (setting third argument as data, and forth as options)', async () => {
      const action = 'set';
      const actionPath = '123ABC';
      const testData = { asdf: 'asdf' };
      const options = { withMeta: false };
      await loadedCustomCommands.callRtdb(
        action,
        actionPath,
        testData,
        options,
      );
      expect(taskSpy).to.have.been.calledWith('callRtdb', {
        action,
        path: actionPath,
        data: testData,
        options,
      });
    });

    it('calls task with set action including metadata if data is object and withMeta is set to true', async () => {
      const action = 'set';
      const actionPath = '123ABC';
      const testData = { asdf: 'asdf' };
      const options = { withMeta: true };
      await loadedCustomCommands.callRtdb(
        action,
        actionPath,
        testData,
        options,
      );
      expect(taskSpy).to.have.been.calledWith('callRtdb', {
        action,
        path: actionPath,
        data: { ...testData, createdBy: testUserId, createdAt: 'TIMESTAMP' },
        options,
      });
    });

    it('calls task with set action not including metadata if data is an array and withMeta is set to true', async () => {
      const action = 'set';
      const actionPath = '123ABC';
      const testData = [{ asdf: 'asdf' }];
      const options = { withMeta: true };
      await loadedCustomCommands.callRtdb(
        action,
        actionPath,
        testData,
        options,
      );
      expect(taskSpy).to.have.been.calledWith('callRtdb', {
        action,
        path: actionPath,
        data: testData,
        options,
      });
    });

    it('calls task with set action not including metadata if data is a Date and withMeta is set to true', async () => {
      const action = 'set';
      const actionPath = '123ABC';
      const testData = new Date();
      const options = { withMeta: true };
      await loadedCustomCommands.callRtdb(
        action,
        actionPath,
        testData,
        options,
      );
      expect(taskSpy).to.have.been.calledWith('callRtdb', {
        action,
        path: actionPath,
        data: testData,
        options,
      });
    });
  });

  describe('cy.getAuthUser', () => {
    it('Is attached as a custom command', () => {
      expect(addSpy).to.have.been.calledWith('getAuthUser');
    });

    it('calls task with uid', async () => {
      const uid = 'TESTING_USER_UID';
      await loadedCustomCommands.getAuthUser(uid);
      expect(taskSpy).to.have.been.calledWith('getAuthUser', uid);
    });
  });

  describe('options', () => {
    it('Aliases login command', () => {
      const commandNames = { login: 'testing' };
      attachCustomCommands({ cy, Cypress, firebase }, { commandNames });
      expect(addSpy).to.have.been.calledWith(commandNames.login);
      expect(addSpy).to.have.been.calledWith('logout');
      expect(addSpy).to.have.been.calledWith('callRtdb');
      expect(addSpy).to.have.been.calledWith('callFirestore');
      expect(addSpy).to.have.been.calledWith('getAuthUser');
    });

    it('Aliases logout command', () => {
      const commandNames = { logout: 'testing' };
      attachCustomCommands({ cy, Cypress, firebase }, { commandNames });
      expect(addSpy).to.have.been.calledWith(commandNames.logout);
      expect(addSpy).to.have.been.calledWith('login');
      expect(addSpy).to.have.been.calledWith('callRtdb');
      expect(addSpy).to.have.been.calledWith('callFirestore');
      expect(addSpy).to.have.been.calledWith('getAuthUser');
    });

    it('Aliases callRtdb command', () => {
      const commandNames = { callRtdb: 'testing' };
      attachCustomCommands({ cy, Cypress, firebase }, { commandNames });
      expect(addSpy).to.have.been.calledWith(commandNames.callRtdb);
      expect(addSpy).to.have.been.calledWith('login');
      expect(addSpy).to.have.been.calledWith('logout');
      expect(addSpy).to.have.been.calledWith('callFirestore');
      expect(addSpy).to.have.been.calledWith('getAuthUser');
    });

    it('Aliases callFirestore command', () => {
      const commandNames = { callFirestore: 'testing' };
      attachCustomCommands({ cy, Cypress, firebase }, { commandNames });
      expect(addSpy).to.have.been.calledWith(commandNames.callFirestore);
      expect(addSpy).to.have.been.calledWith('login');
      expect(addSpy).to.have.been.calledWith('logout');
      expect(addSpy).to.have.been.calledWith('callRtdb');
      expect(addSpy).to.have.been.calledWith('getAuthUser');
    });

    it('Aliases getAuthUser command', () => {
      const commandNames = { getAuthUser: 'testing' };
      attachCustomCommands({ cy, Cypress, firebase }, { commandNames });
      expect(addSpy).to.have.been.calledWith(commandNames.getAuthUser);
      expect(addSpy).to.have.been.calledWith('login');
      expect(addSpy).to.have.been.calledWith('logout');
      expect(addSpy).to.have.been.calledWith('callRtdb');
      expect(addSpy).to.have.been.calledWith('callFirestore');
    });
  });
});
