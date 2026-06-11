import { describe, expect, it, vi } from 'vitest';
import { initializeFirebase, isString } from '../../src/firebase-utils';

const returnedInstance = {};
const initializeMock = vi.fn(() => returnedInstance);
const settingsMock = vi.fn();
const projectId = 'test-project';
const mockCredential = { project_id: projectId };
const applicationDefaultMock = vi.fn(() => mockCredential);
const certMock = vi.fn((input) => input);
const adminInstanceMock = {
  initializeApp: initializeMock,
  credential: {
    applicationDefault: applicationDefaultMock,
    cert: certMock,
  },
  firestore: vi.fn(() => ({
    settings: settingsMock,
  })),
};

describe('firebase-utils', () => {
  describe('isString', () => {
    it('Should return true if input is a string', () => {
      expect(isString('')).toBe(true);
      expect(isString('asdfasdf')).toBe(true);
    });

    it('Should return true if input is an instance of String', () => {
      expect(isString(String('asdf'))).toBe(true);
    });

    it('Should return false if input is not a string', () => {
      expect(isString([])).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString(new Date())).toBe(false);
    });
  });

  describe('initializeFirebase', () => {
    it('Should call initializeApp with projectId and databaseURL by default', () => {
      const result = initializeFirebase(adminInstanceMock);
      expect(result).toBe(returnedInstance);
      expect(initializeMock).toHaveBeenCalledWith({
        projectId,
        credential: mockCredential,
        databaseURL: `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=${projectId}`,
      });
    });

    it('Should call initializeApp with databaseURL from config override', () => {
      const projectId = 'test-project';
      const databaseURL = `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=test-namespace`;
      const mockCredential: any = { projectId };
      const result = initializeFirebase(adminInstanceMock, {
        databaseURL,
        credential: mockCredential,
      });
      expect(result).toBe(returnedInstance);
      expect(initializeMock).toHaveBeenCalledWith({
        projectId,
        databaseURL,
        credential: mockCredential,
      });
    });

    it('Should call initializeApp with projectId from config override (and use projectId as database namespace)', () => {
      const projectId = 'override-project-test';
      const databaseURL = `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=${projectId}`;
      const mockCredential: any = { projectId };
      const adminInstanceWithCredMock = {
        initializeApp: initializeMock,
        credential: {
          applicationDefault: vi.fn(() => mockCredential),
        },
        firestore: vi.fn(() => ({
          settings: settingsMock,
        })),
      };
      const result = initializeFirebase(adminInstanceWithCredMock, {
        projectId,
      });
      expect(result).toBe(returnedInstance);
      expect(initializeMock).toHaveBeenCalledWith({
        projectId,
        credential: mockCredential,
        databaseURL,
      });
    });

    it('Should use parsed SERVICE_ACCOUNT env variable as credential if it exists', () => {
      const fileData = { type: 'service_account' };
      process.env.SERVICE_ACCOUNT = JSON.stringify(fileData);
      const databaseURL = `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=${projectId}`;
      initializeFirebase(adminInstanceMock, {
        projectId,
      });
      expect(certMock).toHaveBeenCalledWith(fileData);
      expect(initializeMock).toHaveBeenCalledWith({
        projectId,
        credential: fileData,
        databaseURL,
      });
    });

    it('Should throw if there is an issue parsing SERVICE_ACCOUNT env variable', () => {
      process.env.SERVICE_ACCOUNT = '{{{{}';
      try {
        initializeFirebase(adminInstanceMock, {
          projectId,
        });
      } catch (err) {
        expect(err).toHaveProperty(
          'message',
          `cypress-firebase: Issue parsing "SERVICE_ACCOUNT" environment variable from string to object, returning string`,
        );
      }
    });
  });
});
