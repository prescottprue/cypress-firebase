import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import { getServiceAccount } from '../../src/node-utils';

describe('node-utils', () => {
  describe('getServiceAccount', () => {
    beforeEach(() => {
      process.env.SERVICE_ACCOUNT = '';
      process.env.GITHUB_HEAD_REF = '';
    });
    afterEach(() => {
      sinon.restore();
      process.env.SERVICE_ACCOUNT = '';
      process.env.GITHUB_HEAD_REF = '';
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

    it('Should throw if there is an issue parsing SERVICE_ACCOUNT env variable', () => {
      process.env.SERVICE_ACCOUNT = '{{{{}';
      try {
        getServiceAccount();
      } catch (err) {
        expect(err).to.have.property(
          'message',
          `cypress-firebase: Issue parsing "SERVICE_ACCOUNT" environment variable from string to object, returning string`,
        );
      }
    });

    it('Should return parsed service account from env variable if GITHUB_HEAD_REF is set (i.e. STAGE_SERVICE_ACCOUNT) ', () => {
      process.env.GITHUB_HEAD_REF = 'stage';
      const fileData = { type: 'service_account' };
      process.env.STAGE_SERVICE_ACCOUNT = JSON.stringify(fileData);
      const results = getServiceAccount();
      expect(results).to.have.property('type', fileData.type);
    });

    it('Should return parsed service account from env variable if GITHUB_REF is set (i.e. STAGE_SERVICE_ACCOUNT) ', () => {
      process.env.GITHUB_REF = 'refs/heads/stage';
      const fileData = { type: 'service_account' };
      process.env.STAGE_SERVICE_ACCOUNT = JSON.stringify(fileData);
      const results = getServiceAccount();
      expect(results).to.have.property('type', fileData.type);
    });

    it('Should return parsed SERVICE_ACCOUNT variable from cypress.env.json if it exists', () => {
      sinon
        .stub(fs, 'existsSync')
        .withArgs(`${process.cwd()}/serviceAccount`)
        .returns(false)
        .withArgs(`${process.cwd()}/cypress.env.json`)
        .returns(true);
      const fileData = { SERVICE_ACCOUNT: { type: 'service_account' } };
      sinon
        .stub(fs, 'readFileSync')
        .callsFake(() => Buffer.from(JSON.stringify(fileData)));

      const results = getServiceAccount();
      expect(results).to.have.property('type', fileData.SERVICE_ACCOUNT.type);
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
