import { expect } from 'chai';
import sinon from 'sinon';
import { attachCustomCommands } from '../../src';

let taskSpy: any;
const cy: any = { log: sinon.spy() };
const loadedCustomCommands: any = {};
let addSpy: sinon.SinonSpy;
let envStub: sinon.SinonStub<string[], string | number | boolean>;
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
};

describe('attachCustomCommands', () => {
  beforeEach(() => {
    taskSpy = sinon.spy(() => Promise.resolve());
    envStub = sinon.stub();
    onAuthStateChanged = sinon.spy((authHandleFunc) => {
      authHandleFunc({});
    });
    signInWithCustomToken = sinon.spy(() => Promise.resolve());
    cy.task = taskSpy;
    addSpy = sinon.spy((customCommandName: string, customCommandFunc: any) => {
      loadedCustomCommands[customCommandName] = customCommandFunc;
    });
    Cypress = { Commands: { add: addSpy }, env: envStub };
    attachCustomCommands({ cy, Cypress, firebase });
  });

  describe('cy.login', () => {
    it('Is attached as a custom command', () => {
      expect(addSpy).to.have.been.calledWith('login');
    });

    it('throws if no uid is passed or within environment', () => {
      try {
        loadedCustomCommands.login();
      } catch (err) {
        expect(err).to.have.property(
          'message',
          'uid must be passed or TEST_UID set within environment to login',
        );
      }
    });

    it('calls task', async () => {
      await loadedCustomCommands.login('123ABC');
      expect(taskSpy).to.have.been.calledOnce;
      expect(signInWithCustomToken).to.have.been.calledOnce;
    });

    it('calls task with environment test uid', async () => {
      envStub.withArgs('TEST_UID').returns('foo');
      await loadedCustomCommands.login();
      expect(taskSpy).to.have.been.calledOnceWith('createCustomToken', {
        uid: 'foo',
        customClaims: undefined,
        tenantId: undefined,
      });
      expect(signInWithCustomToken).to.have.been.calledOnce;
    });

    it('calls task with tenantId', async () => {
      await loadedCustomCommands.login('123ABC', undefined, 'tenant-id');
      expect(taskSpy).to.have.been.calledOnceWith('createCustomToken', {
        uid: '123ABC',
        customClaims: undefined,
        tenantId: 'tenant-id',
      });
      expect(signInWithCustomToken).to.have.been.calledOnce;
    });

    it('calls task with environment test tenantId', async () => {
      envStub.withArgs('TEST_TENANT_ID').returns('env-tenant-id');
      await loadedCustomCommands.login('123ABC');
      expect(taskSpy).to.have.been.calledOnceWith('createCustomToken', {
        uid: '123ABC',
        customClaims: undefined,
        tenantId: 'env-tenant-id',
      });
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

    it('calls task', async () => {
      const action = 'get';
      const actionPath = '123ABC';
      await loadedCustomCommands.callFirestore(action, actionPath);
      expect(taskSpy).to.have.been.calledWith('callFirestore', {
        action,
        path: actionPath,
        options: undefined,
      });
    });
  });

  describe('cy.callRtdb', () => {
    it('Is attached as a custom command', () => {
      expect(addSpy).to.have.been.calledWith('callRtdb');
    });

    it('calls task', async () => {
      const action = 'get';
      const actionPath = '123ABC';
      await loadedCustomCommands.callRtdb(action, actionPath);
      expect(taskSpy).to.have.been.calledWith('callRtdb', {
        action,
        path: actionPath,
        options: undefined,
      });
    });
  });

  beforeEach(() => {
    taskSpy = sinon.spy(() => Promise.resolve());
    envStub = sinon.stub();
    onAuthStateChanged = sinon.spy((authHandleFunc) => {
      authHandleFunc({});
    });
    signInWithCustomToken = sinon.spy(() => Promise.resolve());
    cy.task = taskSpy;
    addSpy = sinon.spy((customCommandName: string, customCommandFunc: any) => {
      loadedCustomCommands[customCommandName] = customCommandFunc;
    });
    Cypress = { Commands: { add: addSpy }, env: envStub };
    attachCustomCommands({ cy, Cypress, firebase });
  });

  describe('options', () => {
    beforeEach(() => {
      taskSpy = sinon.spy(() => Promise.resolve());
      envStub = sinon.stub();
      onAuthStateChanged = sinon.spy((authHandleFunc) => {
        authHandleFunc({});
      });
      signInWithCustomToken = sinon.spy(() => Promise.resolve());
      cy.task = taskSpy;
      addSpy = sinon.spy(
        (customCommandName: string, customCommandFunc: any) => {
          loadedCustomCommands[customCommandName] = customCommandFunc;
        },
      );
      Cypress = { Commands: { add: addSpy }, env: envStub };
    });

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
