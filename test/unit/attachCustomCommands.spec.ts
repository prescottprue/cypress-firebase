import { beforeEach, describe, expect, it, vi } from 'vitest';
import { attachCustomCommands } from '../../src';

let taskSpy: any;
const cy: any = { log: vi.fn() };
const loadedCustomCommands: any = {};
const testUserId = 'TEST_USER';
let addSpy: ReturnType<typeof vi.fn>;
let envSpy: ReturnType<typeof vi.fn>;
let envStub: ReturnType<typeof vi.fn>;
let Cypress: any = {};
let currentUser: any;
let onAuthStateChanged: any;
let signInWithCustomToken: any;
let signInWithEmailAndPassword: any;
const firebase = {
  app: () => firebase,
  auth: vi.fn(() => ({
    currentUser,
    onAuthStateChanged,
    signInWithCustomToken,
    signInWithEmailAndPassword,
    signOut: vi.fn(() => Promise.resolve()),
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

/**
 * Assert that a command was attached with the provided name
 * (second argument is always the command implementation)
 * @param spy - Spy used as Cypress.Commands.add
 * @param commandName - Name of the custom command
 */
function expectCommandAttached(
  spy: ReturnType<typeof vi.fn>,
  commandName: string,
) {
  expect(spy).toHaveBeenCalledWith(commandName, expect.any(Function));
}

describe('attachCustomCommands', () => {
  beforeEach(() => {
    currentUser = {};
    taskSpy = vi.fn(() => Promise.resolve());
    envSpy = vi.fn((param) => param === 'TEST_UID' && testUserId);
    envStub = vi.fn();
    onAuthStateChanged = vi.fn((authHandleFunc) => {
      authHandleFunc({});
    });
    signInWithCustomToken = vi.fn(() => Promise.resolve());
    signInWithEmailAndPassword = vi.fn(() => Promise.resolve());
    cy.task = taskSpy;
    cy.wrap = vi.fn((value: any) => value);
    // Default to Cypress < 15.10 (no cy.env command) - cy.env tests set this
    cy.env = undefined;
    addSpy = vi.fn((customCommandName: string, customCommandFunc: any) => {
      loadedCustomCommands[customCommandName] = customCommandFunc;
    });
    Cypress = { Commands: { add: addSpy }, env: envSpy };
    attachCustomCommands({ cy, Cypress, firebase });
  });

  describe('cy.login', () => {
    it('is attached as a custom command', () => {
      expectCommandAttached(addSpy, 'login');
    });

    it('throws if no uid is passed or within environment', () => {
      Cypress = { Commands: { add: addSpy }, env: vi.fn() };
      attachCustomCommands({ cy, Cypress, firebase });
      currentUser = undefined;
      try {
        loadedCustomCommands.login();
      } catch (err) {
        expect(err).toHaveProperty(
          'message',
          'uid must be passed or TEST_UID set within environment to login',
        );
      }
    });

    it('returns undefined if pass UID matches already logged in user', async () => {
      const uid = '123ABC';
      currentUser = { uid };
      const returnVal = await loadedCustomCommands.login(uid);
      expect(taskSpy).not.toHaveBeenCalled();
      expect(signInWithCustomToken).not.toHaveBeenCalled();
      expect(returnVal).toBeUndefined();
    });

    it('calls task with parameters and custom claims', async () => {
      await loadedCustomCommands.login('123ABC');
      expect(taskSpy).toHaveBeenCalledTimes(1);
      expect(signInWithCustomToken).toHaveBeenCalledTimes(1);
    });

    it('calls task with environment test uid', async () => {
      Cypress = { Commands: { add: addSpy }, env: envStub };
      attachCustomCommands({ cy, Cypress, firebase });
      envStub.mockImplementation((param) =>
        param === 'TEST_UID' ? 'foo' : undefined,
      );
      await loadedCustomCommands.login();
      expect(taskSpy).toHaveBeenCalledTimes(1);
      expect(taskSpy).toHaveBeenCalledWith('authCreateCustomToken', {
        uid: 'foo',
        customClaims: undefined,
        tenantId: undefined,
      });
      expect(signInWithCustomToken).toHaveBeenCalledTimes(1);
    });

    it('calls task with tenantId', async () => {
      Cypress = { Commands: { add: addSpy }, env: envStub };
      attachCustomCommands({ cy, Cypress, firebase });
      await loadedCustomCommands.login('123ABC', undefined, 'tenant-id');
      expect(taskSpy).toHaveBeenCalledTimes(1);
      expect(taskSpy).toHaveBeenCalledWith('authCreateCustomToken', {
        uid: '123ABC',
        customClaims: undefined,
        tenantId: 'tenant-id',
      });
      expect(signInWithCustomToken).toHaveBeenCalledTimes(1);
    });

    it('calls task with environment test tenantId', async () => {
      Cypress = { Commands: { add: addSpy }, env: envStub };
      attachCustomCommands({ cy, Cypress, firebase });
      envStub.mockImplementation((param) =>
        param === 'TEST_TENANT_ID' ? 'env-tenant-id' : undefined,
      );
      await loadedCustomCommands.login('123ABC');
      expect(taskSpy).toHaveBeenCalledTimes(1);
      expect(taskSpy).toHaveBeenCalledWith('authCreateCustomToken', {
        uid: '123ABC',
        customClaims: undefined,
        tenantId: 'env-tenant-id',
      });
      expect(signInWithCustomToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('cy.loginWithEmailAndPassword', () => {
    it('is attached as a custom command', () => {
      expectCommandAttached(addSpy, 'loginWithEmailAndPassword');
    });

    it('throws if no email is passed or within environment', () => {
      expect(() => loadedCustomCommands.loginWithEmailAndPassword()).toThrow(
        'email must be passed or TEST_EMAIL set within environment to login',
      );
    });

    it('throws if no password is passed or within environment', () => {
      expect(() =>
        loadedCustomCommands.loginWithEmailAndPassword('test@email.com'),
      ).toThrow(
        'password must be passed or TEST_PASSWORD set within environment to login',
      );
    });

    it('returns undefined if passed email matches already logged in user', async () => {
      const email = 'test@email.com';
      currentUser = { email };
      const returnVal = await loadedCustomCommands.loginWithEmailAndPassword(
        email,
        'password',
      );
      expect(taskSpy).not.toHaveBeenCalled();
      expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
      expect(returnVal).toBeUndefined();
    });

    it('logs in directly if the user already exists', async () => {
      const email = 'test@email.com';
      const password = 'password';
      taskSpy.mockImplementation((taskName: string) =>
        taskName === 'authGetUserByEmail'
          ? Promise.resolve({ uid: 'existing-uid', email })
          : Promise.resolve(),
      );
      await loadedCustomCommands.loginWithEmailAndPassword(email, password);
      expect(taskSpy).toHaveBeenCalledWith('authGetUserByEmail', {
        email,
        tenantId: false,
      });
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(email, password);
    });

    it('creates the user then logs in if the user does not exist', async () => {
      const email = 'test@email.com';
      const password = 'password';
      taskSpy.mockImplementation((taskName: string) =>
        taskName === 'authGetUserByEmail'
          ? Promise.resolve(null)
          : Promise.resolve(),
      );
      await loadedCustomCommands.loginWithEmailAndPassword(email, password);
      expect(taskSpy).toHaveBeenCalledWith('authCreateUser', {
        properties: { email, password },
        tenantId: false,
      });
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(email, password);
    });
  });

  describe('cy.logout', () => {
    it('is attached as a custom command', () => {
      expectCommandAttached(addSpy, 'logout');
    });

    it('calls task', async () => {
      // Return empty auth so logout is resolved
      onAuthStateChanged = vi.fn((authHandleFunc) => {
        authHandleFunc();
      });
      await loadedCustomCommands.logout();
      expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
    });
  });

  describe('cy.callFirestore', () => {
    it('is attached as a custom command', () => {
      expectCommandAttached(addSpy, 'callFirestore');
    });

    it('calls task with get action (setting third argument as options)', async () => {
      const action = 'get';
      const actionPath = '123ABC';
      await loadedCustomCommands.callFirestore(action, actionPath);
      expect(taskSpy).toHaveBeenCalledWith('callFirestore', {
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
      expect(taskSpy).toHaveBeenCalledWith('callFirestore', {
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
      expect(taskSpy).toHaveBeenCalledWith('callFirestore', {
        action,
        path: actionPath,
        data: { ...testData, createdBy: testUserId, createdAt: 'TIMESTAMP' },
        options,
      });
    });
  });

  describe('cy.callRtdb', () => {
    it('is attached as a custom command', () => {
      expectCommandAttached(addSpy, 'callRtdb');
    });

    it('calls task with get action (setting third argument as options)', async () => {
      const action = 'get';
      const actionPath = '123ABC';
      await loadedCustomCommands.callRtdb(action, actionPath);
      expect(taskSpy).toHaveBeenCalledWith('callRtdb', {
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
      expect(taskSpy).toHaveBeenCalledWith('callRtdb', {
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
      expect(taskSpy).toHaveBeenCalledWith('callRtdb', {
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
      expect(taskSpy).toHaveBeenCalledWith('callRtdb', {
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
      expect(taskSpy).toHaveBeenCalledWith('callRtdb', {
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
        expectCommandAttached(addSpy, 'authCreateUser');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        await loadedCustomCommands.authCreateUser({ uid });
        expect(taskSpy).toHaveBeenCalledWith('authCreateUser', {
          properties: { uid },
          tenantId: false,
        });
      });

      it('falls back to getting the user by email if it already exists', async () => {
        const email = 'test@email.com';
        const existingUser = { uid: 'existing-uid', email };
        taskSpy.mockImplementation((taskName: string) =>
          taskName === 'authCreateUser'
            ? Promise.resolve('auth/email-already-exists')
            : Promise.resolve(existingUser),
        );
        const result = await loadedCustomCommands.authCreateUser({ email });
        expect(taskSpy).toHaveBeenCalledWith('authGetUserByEmail', {
          email,
          tenantId: false,
        });
        expect(result).toEqual(existingUser);
      });

      it('throws if user with email exists but no email was given', async () => {
        taskSpy.mockImplementation(() =>
          Promise.resolve('auth/email-already-exists'),
        );
        await expect(loadedCustomCommands.authCreateUser({})).rejects.toThrow(
          'User with email already exists yet no email was given',
        );
      });

      it('falls back to getting the user by phone number if it already exists', async () => {
        const phoneNumber = 'A_PHONE_NUMBER';
        const existingUser = { uid: 'existing-uid', phoneNumber };
        taskSpy.mockImplementation((taskName: string) =>
          taskName === 'authCreateUser'
            ? Promise.resolve('auth/phone-number-already-exists')
            : Promise.resolve(existingUser),
        );
        const result = await loadedCustomCommands.authCreateUser({
          phoneNumber,
        });
        expect(taskSpy).toHaveBeenCalledWith('authGetUserByPhoneNumber', {
          phoneNumber,
          tenantId: false,
        });
        expect(result).toEqual(existingUser);
      });

      it('throws if user with phone number exists but no phone number was given', async () => {
        taskSpy.mockImplementation(() =>
          Promise.resolve('auth/phone-number-already-exists'),
        );
        await expect(loadedCustomCommands.authCreateUser({})).rejects.toThrow(
          'User with phone number already exists yet no phone number was given',
        );
      });
    });

    describe('cy.createUserWithClaims', () => {
      it('sets custom claims after creating the user', async () => {
        const uid = 'TESTING_USER_UID';
        const customClaims = { role: 'Admin' };
        taskSpy.mockImplementation((taskName: string) =>
          taskName === 'authCreateUser'
            ? Promise.resolve({ uid })
            : Promise.resolve(),
        );
        loadedCustomCommands.createUserWithClaims({ uid }, customClaims);
        await vi.waitFor(() =>
          expect(taskSpy).toHaveBeenCalledWith('authSetCustomUserClaims', {
            uid,
            customClaims,
            tenantId: false,
          }),
        );
      });
    });
    describe('cy.authImportUsers', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authImportUsers');
      });

      it('calls task with parameters', async () => {
        const uid1 = 'TESTING_USER_UID';
        const uid2 = 'TESTING_USER_UID';
        await loadedCustomCommands.authImportUsers([
          { uid: uid1 },
          { uid: uid2 },
        ]);
        expect(taskSpy).toHaveBeenCalledWith('authImportUsers', {
          usersImport: [{ uid: uid1 }, { uid: uid2 }],
          importOptions: undefined,
          tenantId: false,
        });
      });
    });
    describe('cy.authListUsers', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authListUsers');
      });

      it('calls task with parameters', async () => {
        await loadedCustomCommands.authListUsers(3);
        expect(taskSpy).toHaveBeenCalledWith('authListUsers', {
          maxResults: 3,
          pageToken: undefined,
          tenantId: false,
        });
      });
    });
    describe('cy.authGetUser', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authGetUser');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        await loadedCustomCommands.authGetUser(uid);
        expect(taskSpy).toHaveBeenCalledWith('authGetUser', {
          uid,
          tenantId: false,
        });
      });

      it('returns null if the user is not found', async () => {
        taskSpy.mockImplementation(() =>
          Promise.resolve('auth/user-not-found'),
        );
        const result = await loadedCustomCommands.authGetUser('some-uid');
        expect(result).toBeNull();
      });
    });
    describe('cy.authGetUserByEmail', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authGetUserByEmail');
      });

      it('calls task with parameters', async () => {
        const email = 'testuser@email.com';
        await loadedCustomCommands.authGetUserByEmail(email);
        expect(taskSpy).toHaveBeenCalledWith('authGetUserByEmail', {
          email,
          tenantId: false,
        });
      });
    });
    describe('cy.authGetUserByPhoneNumber', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authGetUserByPhoneNumber');
      });

      it('calls task with parameters', async () => {
        const phoneNumber = 'A_PHONE_NUMBER';
        await loadedCustomCommands.authGetUserByPhoneNumber(phoneNumber);
        expect(taskSpy).toHaveBeenCalledWith('authGetUserByPhoneNumber', {
          phoneNumber,
          tenantId: false,
        });
      });
    });
    describe('cy.authGetUserByProviderUid', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authGetUserByProviderUid');
      });

      it('calls task with parameters', async () => {
        const providerId = 'PROVIDER_ID';
        const uid = 'TESTING_USER_UID';
        await loadedCustomCommands.authGetUserByProviderUid(providerId, uid);
        expect(taskSpy).toHaveBeenCalledWith('authGetUserByProviderUid', {
          providerId,
          uid,
          tenantId: false,
        });
      });
    });
    describe('cy.authGetUsers', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authGetUsers');
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
        expect(taskSpy).toHaveBeenCalledWith('authGetUsers', {
          identifiers,
          tenantId: false,
        });
      });
    });
    describe('cy.authUpdateUser', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authUpdateUser');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        const update = { displayName: 'Test User' };
        await loadedCustomCommands.authUpdateUser(uid, update);
        expect(taskSpy).toHaveBeenCalledWith('authUpdateUser', {
          uid,
          properties: update,
          tenantId: false,
        });
      });
    });
    describe('cy.authSetCustomUserClaims', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authSetCustomUserClaims');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        const claims = { role: 'Admin' };
        await loadedCustomCommands.authSetCustomUserClaims(uid, claims);
        expect(taskSpy).toHaveBeenCalledWith('authSetCustomUserClaims', {
          uid,
          customClaims: claims,
          tenantId: false,
        });
      });
    });
    describe('cy.authDeleteUser', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authDeleteUser');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        await loadedCustomCommands.authDeleteUser(uid);
        expect(taskSpy).toHaveBeenCalledWith('authDeleteUser', {
          uid,
          tenantId: false,
        });
      });

      it('throws if no uid is passed or within environment', () => {
        Cypress = { Commands: { add: addSpy }, env: vi.fn() };
        attachCustomCommands({ cy, Cypress, firebase });
        expect(() => loadedCustomCommands.authDeleteUser()).toThrow(
          'uid must be passed or TEST_UID set within environment to login',
        );
      });
    });
    describe('cy.authDeleteUsers', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authDeleteUsers');
      });

      it('calls task with parameters', async () => {
        const uid1 = 'TESTING_USER_UID';
        const uid2 = 'TESTING_USER_UID';
        await loadedCustomCommands.authDeleteUsers([uid1, uid2]);
        expect(taskSpy).toHaveBeenCalledWith('authDeleteUsers', {
          uids: [uid1, uid2],
          tenantId: false,
        });
      });
    });
    describe('cy.authCreateCustomToken', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authCreateCustomToken');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        const claims = { role: 'Admin' };
        await loadedCustomCommands.authCreateCustomToken(uid, claims);
        expect(taskSpy).toHaveBeenCalledWith('authCreateCustomToken', {
          uid,
          customClaims: claims,
          tenantId: false,
        });
      });
    });
    describe('cy.authCreateSessionCookie', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authCreateSessionCookie');
      });

      it('calls task with parameters', async () => {
        const idToken = 'TESTING';
        const cookieOpts = { expiresIn: 60 * 60 * 24 * 5 };
        await loadedCustomCommands.authCreateSessionCookie(idToken, cookieOpts);
        expect(taskSpy).toHaveBeenCalledWith('authCreateSessionCookie', {
          idToken,
          sessionCookieOptions: cookieOpts,
          tenantId: false,
        });
      });
    });
    describe('cy.authVerifyIdToken', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authVerifyIdToken');
      });

      it('calls task with parameters', async () => {
        const idToken = 'TESTING';
        const checkRevoked = true;
        await loadedCustomCommands.authVerifyIdToken(idToken, checkRevoked);
        expect(taskSpy).toHaveBeenCalledWith('authVerifyIdToken', {
          idToken,
          checkRevoked,
          tenantId: false,
        });
      });
    });
    describe('cy.authRevokeRefreshTokens', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authRevokeRefreshTokens');
      });

      it('calls task with parameters', async () => {
        const uid = 'TESTING_USER_UID';
        await loadedCustomCommands.authRevokeRefreshTokens(uid);
        expect(taskSpy).toHaveBeenCalledWith('authRevokeRefreshTokens', {
          uid,
          tenantId: false,
        });
      });
    });
    describe('cy.authGenerateEmailVerificationLink', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authGenerateEmailVerificationLink');
      });

      it('calls task with parameters', async () => {
        const email = 'testuser@email.com';
        const actionCodeSettings = { url: 'https://example.com' };
        await loadedCustomCommands.authGenerateEmailVerificationLink(
          email,
          actionCodeSettings,
        );
        expect(taskSpy).toHaveBeenCalledWith(
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
        expectCommandAttached(addSpy, 'authGeneratePasswordResetLink');
      });

      it('calls task with parameters', async () => {
        const email = 'testuser@email.com';
        const actionCodeSettings = { url: 'https://example.com' };
        await loadedCustomCommands.authGeneratePasswordResetLink(
          email,
          actionCodeSettings,
        );
        expect(taskSpy).toHaveBeenCalledWith('authGeneratePasswordResetLink', {
          email,
          actionCodeSettings,
          tenantId: false,
        });
      });
    });
    describe('cy.authGenerateSignInWithEmailLink', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authGenerateSignInWithEmailLink');
      });

      it('calls task with parameters', async () => {
        const email = 'testuser@email.com';
        const actionCodeSettings = { url: 'https://example.com' };
        await loadedCustomCommands.authGenerateSignInWithEmailLink(
          email,
          actionCodeSettings,
        );
        expect(taskSpy).toHaveBeenCalledWith(
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
        expectCommandAttached(addSpy, 'authGenerateVerifyAndChangeEmailLink');
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
        expect(taskSpy).toHaveBeenCalledWith(
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
        expectCommandAttached(addSpy, 'authCreateProviderConfig');
      });

      it('calls task with parameters', async () => {
        const providerConfig = {
          clientId: 'CLIENT_ID',
          issuer: 'ISSUER',
        };
        await loadedCustomCommands.authCreateProviderConfig(providerConfig);
        expect(taskSpy).toHaveBeenCalledWith('authCreateProviderConfig', {
          providerConfig,
          tenantId: false,
        });
      });
    });
    describe('cy.authGetProviderConfig', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authGetProviderConfig');
      });

      it('calls task with parameters', async () => {
        const providerId = 'PROVIDER_ID';
        await loadedCustomCommands.authGetProviderConfig(providerId);
        expect(taskSpy).toHaveBeenCalledWith('authGetProviderConfig', {
          providerId,
          tenantId: false,
        });
      });
    });
    describe('cy.authListProviderConfigs', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authListProviderConfigs');
      });

      it('calls task with parameters', async () => {
        const providerFilter = { type: 'oidc', maxResults: 2 };
        await loadedCustomCommands.authListProviderConfigs(providerFilter);
        expect(taskSpy).toHaveBeenCalledWith('authListProviderConfigs', {
          providerFilter,
          tenantId: false,
        });
      });
    });
    describe('cy.authUpdateProviderConfig', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authUpdateProviderConfig');
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
        expect(taskSpy).toHaveBeenCalledWith('authUpdateProviderConfig', {
          providerId,
          providerConfig,
          tenantId: false,
        });
      });
    });
    describe('cy.authDeleteProviderConfig', () => {
      it('is attached as a custom command', () => {
        expectCommandAttached(addSpy, 'authDeleteProviderConfig');
      });

      it('calls task with parameters', async () => {
        const providerId = 'PROVIDER_ID';
        await loadedCustomCommands.authDeleteProviderConfig(providerId);
        expect(taskSpy).toHaveBeenCalledWith('authDeleteProviderConfig', {
          providerId,
          tenantId: false,
        });
      });
    });
  });

  describe('cy.createUserWithClaims', () => {
    it('is attached as a custom command', () => {
      expectCommandAttached(addSpy, 'createUserWithClaims');
    });
  });

  describe('cy.deleteAllAuthUsers', () => {
    it('is attached as a custom command', () => {
      expectCommandAttached(addSpy, 'deleteAllAuthUsers');
    });

    it('deletes users in batches until none remain', async () => {
      let listCallCount = 0;
      taskSpy.mockImplementation((taskName: string) => {
        if (taskName === 'authListUsers') {
          listCallCount += 1;
          return Promise.resolve(
            listCallCount === 1
              ? { users: [{ uid: '1' }, { uid: '2' }], pageToken: undefined }
              : { users: [] },
          );
        }
        return Promise.resolve({ successCount: 2, failureCount: 0 });
      });
      await loadedCustomCommands.deleteAllAuthUsers();
      expect(taskSpy).toHaveBeenCalledWith('authDeleteUsers', {
        uids: ['1', '2'],
        tenantId: false,
      });
      expect(listCallCount).toBe(2);
    });
  });

  describe('cy.env support (Cypress >= 15.10)', () => {
    it('reads environment values through cy.env when available', async () => {
      const envCommandSpy = vi.fn((_keys: string[]) => ({
        then: (envHandler: any) =>
          envHandler({
            TEST_UID: 'cy-env-uid',
            TEST_TENANT_ID: 'cy-env-tenant',
          }),
      }));
      cy.env = envCommandSpy;
      await loadedCustomCommands.login();
      expect(envCommandSpy).toHaveBeenCalledWith([
        'TEST_UID',
        'TEST_TENANT_ID',
      ]);
      expect(taskSpy).toHaveBeenCalledWith('authCreateCustomToken', {
        uid: 'cy-env-uid',
        customClaims: undefined,
        tenantId: 'cy-env-tenant',
      });
      // Deprecated Cypress.env should not be used when cy.env exists
      expect(envSpy).not.toHaveBeenCalled();
    });

    it('uses cy.env for tenantId defaults in auth commands', async () => {
      cy.env = vi.fn((_keys: string[]) => ({
        then: (envHandler: any) => envHandler({ TEST_TENANT_ID: 'cy-tenant' }),
      }));
      await loadedCustomCommands.authListUsers(3);
      expect(taskSpy).toHaveBeenCalledWith('authListUsers', {
        maxResults: 3,
        pageToken: undefined,
        tenantId: 'cy-tenant',
      });
      expect(envSpy).not.toHaveBeenCalled();
    });

    it('uses cy.env for withMeta createdBy in callFirestore', async () => {
      cy.env = vi.fn((_keys: string[]) => ({
        then: (envHandler: any) => envHandler({ TEST_UID: 'cy-env-uid' }),
      }));
      await loadedCustomCommands.callFirestore(
        'set',
        '123ABC',
        { asdf: 'asdf' },
        { withMeta: true },
      );
      expect(taskSpy).toHaveBeenCalledWith('callFirestore', {
        action: 'set',
        path: '123ABC',
        data: { asdf: 'asdf', createdBy: 'cy-env-uid', createdAt: 'TIMESTAMP' },
        options: { withMeta: true },
      });
      expect(envSpy).not.toHaveBeenCalled();
    });

    it('falls back to Cypress.env for values cy.env does not return (runtime-set values)', async () => {
      // cy.env does not see values set at runtime via Cypress.env(key, value)
      cy.env = vi.fn((_keys: string[]) => ({
        then: (envHandler: any) => envHandler({}),
      }));
      await loadedCustomCommands.login();
      expect(envSpy).toHaveBeenCalledWith('TEST_UID');
      expect(taskSpy).toHaveBeenCalledWith('authCreateCustomToken', {
        uid: testUserId,
        customClaims: undefined,
        tenantId: false,
      });
    });

    it('ignores Cypress.env failures when reading fallbacks (allowCypressEnv: false)', async () => {
      Cypress = {
        Commands: { add: addSpy },
        env: vi.fn(() => {
          throw new Error('Cypress.env is disabled');
        }),
      };
      attachCustomCommands({ cy, Cypress, firebase });
      cy.env = vi.fn((_keys: string[]) => ({
        then: (envHandler: any) => envHandler({ TEST_UID: 'strict-uid' }),
      }));
      await loadedCustomCommands.login();
      expect(taskSpy).toHaveBeenCalledWith('authCreateCustomToken', {
        uid: 'strict-uid',
        customClaims: undefined,
        tenantId: undefined,
      });
    });
  });

  describe('options', () => {
    allCommandNames.forEach((commandName) => {
      it(`Aliases ${commandName} command`, () => {
        const commandNames = { [commandName]: 'testing' };
        attachCustomCommands({ cy, Cypress, firebase }, { commandNames });
        expectCommandAttached(addSpy, 'testing');
        allCommandNames
          .filter((name) => name !== commandName)
          .forEach((name) => {
            expectCommandAttached(addSpy, name);
          });
      });
    });
  });
});
