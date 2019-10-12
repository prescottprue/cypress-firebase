import buildRtdbCommand from '../../src/buildRtdbCommand';
import { expect } from 'chai';
import sinon from 'sinon';

const addSpy = sinon.spy()
const envSpy = sinon.spy()
const Cypress = { Commands: { add: addSpy }, env: envSpy }

const firebasePath = '$(npm bin)/firebase'

describe('buildRtdbCommand', () => {
  describe('get', () => {
    it('calls get with a path', () => {
      const actionPath = 'some/path'
      const action = 'get'
      expect(buildRtdbCommand(Cypress, action, actionPath))
        .to.equal(`${firebasePath} database:${action} /${actionPath}`)
    })
  });

  describe('set', () => {
    it('creates a set command with path and object data', () => {
      const actionPath = 'some/path'
      const action = 'set'
      const data = { some: 'other' }
      expect(buildRtdbCommand(Cypress, action, actionPath, data))
        .to.equal(`${firebasePath} database:${action} /${actionPath} -d '${JSON.stringify(data)}' -y`)
    })

    it('creates a set command with path and non-string value', () => {
      const actionPath = 'some/path'
      const action = 'set'
      const data = 123
      expect(buildRtdbCommand(Cypress, action, actionPath, data))
        .to.equal(`${firebasePath} database:${action} /${actionPath} ${data} -y`)
    })

    it('creates a set command with path and string value', () => {
      const actionPath = 'some/path'
      const action = 'set'
      const data = '123ABC'
      expect(buildRtdbCommand(Cypress, action, actionPath, data))
        .to.equal(`${firebasePath} database:${action} /${actionPath} ${data} -y`)
    })
  });

  describe('update', () => {
    it('calls update with a path', () => {
      const actionPath = 'some/path'
      const action = 'update'
      const data = { some: 'other' }
      expect(buildRtdbCommand(Cypress, action, actionPath, data))
        .to.equal(`${firebasePath} database:${action} /${actionPath} -d '${JSON.stringify(data)}' -y`)
    })
  });
});