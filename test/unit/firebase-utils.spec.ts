import { expect } from 'chai';
import sinon from 'sinon';
import * as firebaseApp from 'firebase-admin/app';
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

  describe.skip('initializeFirebase', () => {
    it('Should call initializeApp with projectId and databaseURL by default', () => {
      const returnedInstance = {};
      const initializeMock = sinon.spy(() => returnedInstance);
      const initializeAppStub = sinon.stub(firebaseApp, 'initializeApp');
      const projectId = 'test-project';
      const mockCredential = { projectId };
      const result = initializeFirebase();
      // expect(result).to.equal(returnedInstance);
      expect(initializeAppStub).to.have.been.calledWith({
        projectId,
        credential: mockCredential,
        databaseURL: `http://localhost:9000?ns=${projectId}`,
      });
    });

    it('Should call initializeApp with databaseURL from config override', () => {
      const returnedInstance = {};
      const initializeMock = sinon.spy(() => returnedInstance);
      const initializeAppStub = sinon.stub(firebaseApp, 'initializeApp');
      const databaseURL = 'http://localhost:9000?ns=test-namespace';
      const projectId = 'test-project';
      const mockCredential: any = { projectId };
      const result = initializeFirebase({
        databaseURL,
        credential: mockCredential,
      });
      expect(result).to.equal(returnedInstance);
      expect(initializeAppStub).to.have.been.calledWith({
        projectId,
        databaseURL,
        credential: mockCredential,
      });
    });

    it('Should call initializeApp with projectId from config override (and use projectId as database namespace)', () => {
      const returnedInstance = {};
      const projectId = 'override-project-test';
      const databaseURL = `http://localhost:9000?ns=${projectId}`;
      const mockCredential: any = { projectId };
      const initializeAppStub = sinon.stub(firebaseApp, 'initializeApp');
      sinon
        .stub(firebaseApp, 'applicationDefault')
        .callsFake(() => mockCredential);
      const result = initializeFirebase({ projectId });
      expect(result).to.equal(returnedInstance);
      expect(initializeAppStub).to.have.been.calledWith({
        projectId,
        credential: mockCredential,
        databaseURL,
      });
    });
  });
});
