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
      const adminInstanceMock = {
        initializeApp: initializeMock,
        firestore: sinon.spy(() => ({
          settings: settingsMock,
        })),
      };
      const result = initializeFirebase(adminInstanceMock);
      expect(result).to.equal(returnedInstance);
      const projectId = 'test-project';
      expect(initializeMock).to.have.been.calledWith({
        projectId,
        databaseURL: `http://localhost:9000?ns=${projectId}`,
      });
    });
  });
});
