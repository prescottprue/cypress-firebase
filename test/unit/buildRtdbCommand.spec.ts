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
    
    it('supports orderByChild (--order-by flag for firebase-tools)', () => {
      const actionPath = 'some/path'
      const action = 'get'
      const orderByChild = 'asdf'
      expect(buildRtdbCommand(Cypress, action, actionPath, { orderByChild  }))
        .to.equal(`${firebasePath} database:${action} /${actionPath} --order-by ${orderByChild}`)
    })

    it('supports orderByKey (--order-by-key flag for firebase-tools)', () => {
      const actionPath = 'some/path'
      const action = 'get'
      expect(buildRtdbCommand(Cypress, action, actionPath, { orderByKey: true  }))
        .to.equal(`${firebasePath} database:${action} /${actionPath} --order-by-key`)
    })

    it('supports orderByValue (--order-by-value flag for firebase-tools)', () => {
      const actionPath = 'some/path'
      const action = 'get'
      expect(buildRtdbCommand(Cypress, action, actionPath, { orderByValue: true  }))
        .to.equal(`${firebasePath} database:${action} /${actionPath} --order-by-value`)
    })

    it('supports startAt (--start-at flag for firebase-tools)', () => {
      const actionPath = 'some/path'
      const action = 'get'
      const startAt = 'asdf'
      expect(buildRtdbCommand(Cypress, action, actionPath, { startAt  }))
        .to.equal(`${firebasePath} database:${action} /${actionPath} --start-at ${startAt}`)
    })

    it('supports endAt (--end-at flag for firebase-tools)', () => {
      const actionPath = 'some/path'
      const action = 'get'
      const endAt = 'asdf'
      expect(buildRtdbCommand(Cypress, action, actionPath, { endAt }))
        .to.equal(`${firebasePath} database:${action} /${actionPath} --end-at ${endAt}`)
    })

    it('supports equalTo (--equal-to flag for firebase-tools)', () => {
      const actionPath = 'some/path'
      const action = 'get'
      const equalTo = 'asdf'
      expect(buildRtdbCommand(Cypress, action, actionPath, { equalTo }))
        .to.equal(`${firebasePath} database:${action} /${actionPath} --equal-to ${equalTo}`)
    })

    it('supports instance (--instance flag for firebase-tools)', () => {
      const actionPath = 'some/path'
      const action = 'get'
      const instance = 'asdf'
      expect(buildRtdbCommand(Cypress, action, actionPath, { instance }))
        .to.equal(`${firebasePath} database:${action} /${actionPath} --instance ${instance}`)
    })

    it('supports limitToLast (--limitToLast flag for firebase-tools)', () => {
      const actionPath = 'some/path'
      const action = 'get'
      const limitToLast = 'asdf'
      expect(buildRtdbCommand(Cypress, action, actionPath, { limitToLast }))
        .to.equal(`${firebasePath} database:${action} /${actionPath} --order-by-key --limit-to-last ${limitToLast}`)
    })

    describe('supports limitToFirst (--limitToFirst flag for firebase-tools)', () => {
      it('as a boolean (defaults to 1 with order by key)', () => {
        const actionPath = 'some/path'
        const action = 'get'
        const limitToFirst = 1
        expect(buildRtdbCommand(Cypress, action, actionPath, { limitToFirst }))
          .to.equal(`${firebasePath} database:${action} /${actionPath} --order-by-key --limit-to-first ${limitToFirst}`)
      })

      it('as a string', () => {
        const actionPath = 'some/path'
        const action = 'get'
        const limitToFirst = 'asdf'
        expect(buildRtdbCommand(Cypress, action, actionPath, { limitToFirst }))
          .to.equal(`${firebasePath} database:${action} /${actionPath} --order-by-key --limit-to-first ${limitToFirst}`)
      })
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