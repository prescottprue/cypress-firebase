import { expect } from 'chai';
import sinon from 'sinon';
import { attachCustomCommands } from '../../src';

let taskSpy: any;
const cy: any = { log: sinon.spy() };
const loadedCustomCommands: any = {};
const testUserId = 'TEST_USER';
let addSpy: sinon.SinonSpy;
let envSpy: sinon.SinonSpy;
let envStub: sinon.SinonStub<string[], string | number | boolean>;
let Cypress: any = {};
let currentUser: any;
let onAuthStateChanged: any;
let signInWithCustomToken: any;
const firebase = {
  app: () => firebase,
  auth: sinon.spy(() => ({
    currentUser,
    onAuthStateChanged,
    signInWithCustomToken,
    signOut: sinon.spy(() => Promise.resolve()),
  })),
  database: { ServerValue: { TIMESTAMP: 'TIMESTAMP' } },
  firestore: { Timestamp: { now: () => 'TIMESTAMP' } },
};

const allCommandNames = [
  'callRtdb',
  'callFirestore',
  'authCreateUser',
  'createUserWithClaims',
  'authImportUsers',
  'authListUsers',
  'login',
  'loginWithEmailAndPassword',
  'logout',
  'authGetUser',
  'authGetUserByEmail',
  'authGetUserByPhoneNumber',
  'authGetUserByProviderUid',
  'authGetUsers',
  'authUpdateUser',
  'authSetCustomUserClaims',
  'authDeleteUser',
  'authDeleteUsers',
  'deleteAllAuthUsers',
  'authCreateCustomToken',
  'authCreateSessionCookie',
  'authVerifyIdToken',
  'authRevokeRefreshTokens',
  'authGenerateEmailVerificationLink',
  'authGeneratePasswordResetLink',
  'authGenerateSignInWithEmailLink',
  'authGenerateVerifyAndChangeEmailLink',
  'authCreateProviderConfig',
  'authGetProviderConfig',
  'authListProviderConfigs',
  'authUpdateProviderConfig',
  'authDeleteProviderConfig',
];

describe('attachCustomCommands', () => {
  beforeEach(() => {
    currentUser = {};
    taskSpy = sinon.spy(() => Promise.resolve());
    envSpy = sinon.spy((param) => param === 'TEST_UID' && testUserId);
    envStub = sinon.stub();
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
    it('is attached as a custom command', () => {
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

    it('calls task with parameters and custom claims', async () => {
      await loadedCustomCommands.login('123ABC');
      expect(taskSpy).to.have.been.calledOnce;
      expect(signInWithCustomToken).to.have.been.calledOnce;
    });

    it('calls task with environment test uid', async () => {
      Cypress = { Commands: { add: addSpy }, env: envStub };
      attachCustomCommands({ cy, Cypress, firebase });
      envStub.withArgs('TEST_UID').returns('foo');
      await loadedCustomCommands.login();
      expect(taskSpy).to.have.been.calledOnceWith('authCreateCustomToken', {
        uid: 'foo',
        customClaims: undefined,
        tenantId: undefined,
      });
      expect(signInWithCustomToken).to.have.been.calledOnce;
    });

    it('calls task with tenantId', async () => {
      Cypress = { Commands: { add: addSpy }, env: envStub };
      attachCustomCommands({ cy, Cypress, firebase });
      await loadedCustomCommands.login('123ABC', undefined, 'tenant-id');
      expect(taskSpy).to.have.been.calledOnceWith('authCreateCustomToken', {
        uid: '123ABC',
        customClaims: undefined,
        tenantId: 'tenant-id',
      });
      expect(signInWithCustomToken).to.have.been.calledOnce;
    });

    it('calls task with environment test tenantId', async () => {
      Cypress = { Commands: { add: addSpy }, env: envStub };
      attachCustomCommands({ cy, Cypress, firebase });
      envStub.withArgs('TEST_TENANT_ID').returns('env-tenant-id');
      await loadedCustomCommands.login('123ABC');
      expect(taskSpy).to.have.been.calledOnceWith('authCreateCustomToken', {
        uid: '123ABC',
        customClaims: undefined,
        tenantId: 'env-tenant-id',
      });
      expect(signInWithCustomToken).to.have.been.calledOnce;
    });
  });

  describe('cy.loginWithEmailAndPassword', () => {
    it('is attached as a custom command', () => {
      expect(addSpy).to.have.been.calledWith('loginWithEmailAndPassword');
    });

    // it('calls task', async () => {
    //   // Return empty auth so logout is resolved
    //   onAuthStateChanged = sinon.spy((authHandleFunc) => {
    //     authHandleFunc();
    //   });
    //   await loadedCustomCommands.logout();
    //   expect(onAuthStateChanged).to.have.been.calledOnce;
    // });
  });

  describe('cy.logout', () => {
    it('is attached as a custom command', () => {
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
    it('is attached as a custom command', () => {
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
    it('is attached as a custom command', () => {
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

  describe('firebase auth functions', () => {
    describe('cy.authCreateUser', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authCreateUser');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        await loadedCustomCommands.authCreateUser({ uid });
        expect(taskSpy).to.have.been.calledWith('authCreateUser', {
          properties: { uid },
          tenantId: false,
        });
      });
    });
    describe('cy.authImportUsers', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authImportUsers');
      });

      it('calls task with parameters', async () => {
        const uid1 = 'TESTING_USER_UID';
        const uid2 = 'TESTING_USER_UID';
        await loadedCustomCommands.authImportUsers([
          { uid: uid1 },
          { uid: uid2 },
        ]);
        expect(taskSpy).to.have.been.calledWith('authImportUsers', {
          usersImport: [{ uid: uid1 }, { uid: uid2 }],
          importOptions: undefined,
          tenantId: false,
        });
      });
    });
    describe('cy.authListUsers', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authListUsers');
      });

      it('calls task with parameters', async () => {
        await loadedCustomCommands.authListUsers(3);
        expect(taskSpy).to.have.been.calledWith('authListUsers', {
          maxResults: 3,
          pageToken: undefined,
          tenantId: false,
        });
      });
    });
    describe('cy.authGetUser', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authGetUser');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        await loadedCustomCommands.authGetUser(uid);
        expect(taskSpy).to.have.been.calledWith('authGetUser', {
          uid,
          tenantId: false,
        });
      });
    });
    describe('cy.authGetUserByEmail', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authGetUserByEmail');
      });

      it('calls task with parameters', async () => {
        const email = 'testuser@email.com';
        await loadedCustomCommands.authGetUserByEmail(email);
        expect(taskSpy).to.have.been.calledWith('authGetUserByEmail', {
          email,
          tenantId: false,
        });
      });
    });
    describe('cy.authGetUserByPhoneNumber', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authGetUserByPhoneNumber');
      });

      it('calls task with parameters', async () => {
        const phoneNumber = 'A_PHONE_NUMBER';
        await loadedCustomCommands.authGetUserByPhoneNumber(phoneNumber);
        expect(taskSpy).to.have.been.calledWith('authGetUserByPhoneNumber', {
          phoneNumber,
          tenantId: false,
        });
      });
    });
    describe('cy.authGetUserByProviderUid', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authGetUserByProviderUid');
      });

      it('calls task with parameters', async () => {
        const providerId = 'PROVIDER_ID';
        const uid = 'TESTING_USER_UID';
        await loadedCustomCommands.authGetUserByProviderUid(providerId, uid);
        expect(taskSpy).to.have.been.calledWith('authGetUserByProviderUid', {
          providerId,
          uid,
          tenantId: false,
        });
      });
    });
    describe('cy.authGetUsers', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authGetUsers');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        const email = 'testuser@email.com';
        const phoneNumber = 'A_PHONE_NUMBER';
        const providerId = 'PROVIDER_ID';
        const identifiers = [
          { uid },
          { email },
          { phoneNumber },
          { providerId, providerUid: uid },
        ];
        await loadedCustomCommands.authGetUsers(identifiers);
        expect(taskSpy).to.have.been.calledWith('authGetUsers', {
          identifiers,
          tenantId: false,
        });
      });
    });
    describe('cy.authUpdateUser', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authUpdateUser');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        const update = { displayName: 'Test User' };
        await loadedCustomCommands.authUpdateUser(uid, update);
        expect(taskSpy).to.have.been.calledWith('authUpdateUser', {
          uid,
          properties: update,
          tenantId: false,
        });
      });
    });
    describe('cy.authSetCustomUserClaims', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authSetCustomUserClaims');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        const claims = { role: 'Admin' };
        await loadedCustomCommands.authSetCustomUserClaims(uid, claims);
        expect(taskSpy).to.have.been.calledWith('authSetCustomUserClaims', {
          uid,
          customClaims: claims,
          tenantId: false,
        });
      });
    });
    describe('cy.authDeleteUser', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authDeleteUser');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        await loadedCustomCommands.authDeleteUser(uid);
        expect(taskSpy).to.have.been.calledWith('authDeleteUser', {
          uid,
          tenantId: false,
        });
      });
    });
    describe('cy.authDeleteUsers', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authDeleteUsers');
      });

      it('calls task with parameters', async () => {
        const uid1 = 'TESTING_USER_UID';
        const uid2 = 'TESTING_USER_UID';
        await loadedCustomCommands.authDeleteUsers([uid1, uid2]);
        expect(taskSpy).to.have.been.calledWith('authDeleteUsers', {
          uids: [uid1, uid2],
          tenantId: false,
        });
      });
    });
    describe('cy.authCreateCustomToken', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authCreateCustomToken');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        const claims = { role: 'Admin' };
        await loadedCustomCommands.authCreateCustomToken(uid, claims);
        expect(taskSpy).to.have.been.calledWith('authCreateCustomToken', {
          uid,
          customClaims: claims,
          tenantId: false,
        });
      });
    });
    describe('cy.authCreateSessionCookie', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authCreateSessionCookie');
      });

      it('calls task with parameters', async () => {
        const idToken = 'TESTING';
        const cookieOpts = { expiresIn: 60 * 60 * 24 * 5 };
        await loadedCustomCommands.authCreateSessionCookie(idToken, cookieOpts);
        expect(taskSpy).to.have.been.calledWith('authCreateSessionCookie', {
          idToken,
          sessionCookieOptions: cookieOpts,
          tenantId: false,
        });
      });
    });
    describe('cy.authVerifyIdToken', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authVerifyIdToken');
      });

      it('calls task with parameters', async () => {
        const idToken = 'TESTING';
        const checkRevoked = true;
        await loadedCustomCommands.authVerifyIdToken(idToken, checkRevoked);
        expect(taskSpy).to.have.been.calledWith('authVerifyIdToken', {
          idToken,
          checkRevoked,
          tenantId: false,
        });
      });
    });
    describe('cy.authRevokeRefreshTokens', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authRevokeRefreshTokens');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        await loadedCustomCommands.authRevokeRefreshTokens(uid);
        expect(taskSpy).to.have.been.calledWith('authRevokeRefreshTokens', {
          uid,
          tenantId: false,
        });
      });
    });
    describe('cy.authGenerateEmailVerificationLink', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith(
          'authGenerateEmailVerificationLink',
        );
      });

      it('calls task with parameters', async () => {
        const email = 'testuser@email.com';
        const actionCodeSettings = { url: 'https://example.com' };
        await loadedCustomCommands.authGenerateEmailVerificationLink(
          email,
          actionCodeSettings,
        );
        expect(taskSpy).to.have.been.calledWith(
          'authGenerateEmailVerificationLink',
          {
            email,
            actionCodeSettings,
            tenantId: false,
          },
        );
      });
    });
    describe('cy.authGeneratePasswordResetLink', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authGeneratePasswordResetLink');
      });

      it('calls task with parameters', async () => {
        const email = 'testuser@email.com';
        const actionCodeSettings = { url: 'https://example.com' };
        await loadedCustomCommands.authGeneratePasswordResetLink(
          email,
          actionCodeSettings,
        );
        expect(taskSpy).to.have.been.calledWith(
          'authGeneratePasswordResetLink',
          {
            email,
            actionCodeSettings,
            tenantId: false,
          },
        );
      });
    });
    describe('cy.authGenerateSignInWithEmailLink', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith(
          'authGenerateSignInWithEmailLink',
        );
      });

      it('calls task with parameters', async () => {
        const email = 'testuser@email.com';
        const actionCodeSettings = { url: 'https://example.com' };
        await loadedCustomCommands.authGenerateSignInWithEmailLink(
          email,
          actionCodeSettings,
        );
        expect(taskSpy).to.have.been.calledWith(
          'authGenerateSignInWithEmailLink',
          {
            email,
            actionCodeSettings,
            tenantId: false,
          },
        );
      });
    });
    describe('cy.authGenerateVerifyAndChangeEmailLink', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith(
          'authGenerateVerifyAndChangeEmailLink',
        );
      });

      it('calls task with parameters', async () => {
        const email = 'testuser@email.com';
        const newEmail = 'second@email.com';
        const actionCodeSettings = { url: 'https://example.com' };
        await loadedCustomCommands.authGenerateVerifyAndChangeEmailLink(
          email,
          newEmail,
          actionCodeSettings,
        );
        expect(taskSpy).to.have.been.calledWith(
          'authGenerateVerifyAndChangeEmailLink',
          {
            email,
            newEmail,
            actionCodeSettings,
            tenantId: false,
          },
        );
      });
    });
    describe('cy.authCreateProviderConfig', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authCreateProviderConfig');
      });

      it('calls task with parameters', async () => {
        const providerConfig = {
          clientId: 'CLIENT_ID',
          issuer: 'ISSUER',
        };
        await loadedCustomCommands.authCreateProviderConfig(providerConfig);
        expect(taskSpy).to.have.been.calledWith('authCreateProviderConfig', {
          providerConfig,
          tenantId: false,
        });
      });
    });
    describe('cy.authGetProviderConfig', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authGetProviderConfig');
      });

      it('calls task with parameters', async () => {
        const providerId = 'PROVIDER_ID';
        await loadedCustomCommands.authGetProviderConfig(providerId);
        expect(taskSpy).to.have.been.calledWith('authGetProviderConfig', {
          providerId,
          tenantId: false,
        });
      });
    });
    describe('cy.authListProviderConfigs', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authListProviderConfigs');
      });

      it('calls task with parameters', async () => {
        const providerFilter = { type: 'oidc', maxResults: 2 };
        await loadedCustomCommands.authListProviderConfigs(providerFilter);
        expect(taskSpy).to.have.been.calledWith('authListProviderConfigs', {
          providerFilter,
          tenantId: false,
        });
      });
    });
    describe('cy.authUpdateProviderConfig', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authUpdateProviderConfig');
      });

      it('calls task with parameters', async () => {
        const providerId = 'PROVIDER_ID';
        const providerConfig = {
          clientId: 'CLIENT_ID',
          issuer: 'ISSUER',
        };
        await loadedCustomCommands.authUpdateProviderConfig(
          providerId,
          providerConfig,
        );
        expect(taskSpy).to.have.been.calledWith('authUpdateProviderConfig', {
          providerId,
          providerConfig,
          tenantId: false,
        });
      });
    });
    describe('cy.authDeleteProviderConfig', () => {
      it('is attached as a custom command', () => {
        expect(addSpy).to.have.been.calledWith('authDeleteProviderConfig');
      });

      it('calls task with parameters', async () => {
        const providerId = 'PROVIDER_ID';
        await loadedCustomCommands.authDeleteProviderConfig(providerId);
        expect(taskSpy).to.have.been.calledWith('authDeleteProviderConfig', {
          providerId,
          tenantId: false,
        });
      });
    });
  });

  describe('cy.createUserWithClaims', () => {
    it('is attached as a custom command', () => {
      expect(addSpy).to.have.been.calledWith('createUserWithClaims');
    });
  });

  describe('cy.deleteAllAuthUsers', () => {
    it('is attached as a custom command', () => {
      expect(addSpy).to.have.been.calledWith('deleteAllAuthUsers');
    });
  });

  describe('options', () => {
    allCommandNames.forEach((commandName) => {
      it(`Aliases ${commandName} command`, () => {
        const commandNames = { [commandName]: 'testing' };
        attachCustomCommands({ cy, Cypress, firebase }, { commandNames });
        expect(addSpy).to.have.been.calledWith('testing');
        allCommandNames
          .filter((name) => name !== commandName)
          .forEach((name) => {
            expect(addSpy).to.have.been.calledWith(name);
          });
      });
    });
  });
});
