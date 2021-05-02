import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import { getServiceAccount } from '../../src/node-utils';

describe('node-utils', () => {
  describe('getServiceAccount', () => {
    afterEach(() => {
      sinon.restore();
      process.env.SERVICE_ACCOUNT = undefined;
    });
    it('Should return null if service account in not found in file or environment ', () => {
      const results = getServiceAccount();
      expect(results).to.be.null;
    });

    it('Should return service account file if it exists', () => {
      const fileData = { type: 'service_account' };
      const fileContents = JSON.stringify(fileData);
      sinon.stub(fs, 'existsSync').callsFake(() => true);
      sinon.stub(fs, 'readFileSync').callsFake(() => Buffer.from(fileContents));
      const results = getServiceAccount();
      expect(results).to.have.property('type', fileData.type);
    });

    it('Should return parsed SERVICE_ACCOUNT env variable if it exists', () => {
      const fileData = { type: 'service_account' };
      process.env.SERVICE_ACCOUNT = JSON.stringify(fileData);
      const results = getServiceAccount();
      expect(results).to.have.property('type', fileData.type);
    });

    it('Should throw an error if readFileSync throws an error', () => {
      sinon.stub(fs, 'existsSync').callsFake(() => true);
      const testErrorMessage = 'asdfasdf';
      sinon.stub(fs, 'readFileSync').callsFake(() => {
        throw new Error(testErrorMessage);
      });
      try {
        getServiceAccount();
      } catch (err) {
        expect(err).to.have.property('message', testErrorMessage);
      }
    });
  });
});
