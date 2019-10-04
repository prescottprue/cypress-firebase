import buildFirestoreCommand from '../../src/buildFirestoreCommand';
import { expect } from 'chai';
import sinon from 'sinon';

const addSpy = sinon.spy()
const envSpy = sinon.spy()
const Cypress = { Commands: { add: addSpy }, env: envSpy }

const firebaseExtraPath = '$(npm bin)/firebase-extra'

describe('buildFirestoreCommand', () => {
  describe('get', () => {
    it('calls get with a path', () => {
      const actionPath = 'some/path'
      const action = 'get'
      expect(buildFirestoreCommand(Cypress, action, actionPath))
        .to.equal(`${firebaseExtraPath} firestore ${action} ${actionPath}`)
    })
  });

  describe('set', () => {
    it('calls set with a path', () => {
      const actionPath = 'some/path'
      const action = 'set'
      const data = { some: 'other' }
      expect(buildFirestoreCommand(Cypress, action, actionPath, data))
        .to.equal(`${firebaseExtraPath} firestore ${action} ${actionPath} '${JSON.stringify(data)}'`)
    })
  });

  describe('update', () => {
    it('calls update with a path', () => {
      const actionPath = 'some/path'
      const action = 'update'
      const data = { some: 'other' }
      expect(buildFirestoreCommand(Cypress, action, actionPath, data))
        .to.equal(`${firebaseExtraPath} firestore ${action} ${actionPath} '${JSON.stringify(data)}'`)
    })
  });
});