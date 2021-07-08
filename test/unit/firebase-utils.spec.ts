import { expect } from 'chai';
import sinon from 'sinon';
import { isString, initializeFirebase } from '../../src/firebase-utils';

describe('firebase-utils', () => {
  describe('isString', () => {
    it('Should return true if input is a string', () => {
      expect(isString('')).to.be.true;
      expect(isString('asdfasdf')).to.be.true;
    });

    it('Should return true if input is an instance of String', () => {
      expect(isString(String('asdf'))).to.be.true;
    });

    it('Should return false if input is not a string', () => {
      expect(isString([])).to.be.false;
      expect(isString({})).to.be.false;
      expect(isString(new Date())).to.be.false;
    });
  });

  describe('initializeFirebase', () => {
    it('Should call initializeApp with projectId and databaseURL by default', () => {
      const returnedInstance = {};
      const initializeMock = sinon.spy(() => returnedInstance);
      const settingsMock = sinon.spy();
      const projectId = 'test-project';
      const mockCredential = { projectId };
      const adminInstanceMock = {
        initializeApp: initializeMock,
        credential: {
          applicationDefault: sinon.spy(() => mockCredential),
        },
        firestore: sinon.spy(() => ({
          settings: settingsMock,
        })),
      };
      const result = initializeFirebase(adminInstanceMock);
      expect(result).to.equal(returnedInstance);
      expect(initializeMock).to.have.been.calledWith({
        projectId,
        credential: mockCredential,
        databaseURL: `http://localhost:9000?ns=${projectId}`,
      });
    });

    it('Should call initializeApp with databaseURL from config override', () => {
      const returnedInstance = {};
      const initializeMock = sinon.spy(() => returnedInstance);
      const settingsMock = sinon.spy();
      const databaseURL = 'http://localhost:9000?ns=test-namespace';
      const projectId = 'test-project';
      const adminInstanceMock = {
        initializeApp: initializeMock,
        firestore: sinon.spy(() => ({
          settings: settingsMock,
        })),
      };
      const mockCredential: any = { projectId };
      const result = initializeFirebase(adminInstanceMock, {
        databaseURL,
        credential: mockCredential,
      });
      expect(result).to.equal(returnedInstance);
      expect(initializeMock).to.have.been.calledWith({
        projectId,
        databaseURL,
        credential: mockCredential,
      });
    });

    it('Should call initializeApp with projectId from config override (and use projectId as database namespace)', () => {
      const returnedInstance = {};
      const initializeMock = sinon.spy(() => returnedInstance);
      const settingsMock = sinon.spy();
      const projectId = 'override-project-test';
      const databaseURL = `http://localhost:9000?ns=${projectId}`;
      const mockCredential: any = { projectId };
      const adminInstanceMock = {
        initializeApp: initializeMock,
        credential: {
          applicationDefault: sinon.spy(() => mockCredential),
        },
        firestore: sinon.spy(() => ({
          settings: settingsMock,
        })),
      };
      const result = initializeFirebase(adminInstanceMock, { projectId });
      expect(result).to.equal(returnedInstance);
      expect(initializeMock).to.have.been.calledWith({
        projectId,
        credential: mockCredential,
        databaseURL,
      });
    });
  });
});
