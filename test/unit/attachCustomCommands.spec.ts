import { attachCustomCommands } from '../../src';
import { expect } from 'chai';
import sinon from 'sinon';

const cy: any = {}
const addSpy = sinon.spy()
const Cypress = { Commands: { add: addSpy } }
const firebase = {}

describe('attachCustomCommands', () => {
  before(() => {
    attachCustomCommands({ cy, Cypress, firebase })
  })

  it('Sets cy.login', () => {
    expect(addSpy).to.have.been.calledWith("login")
  });

  it('Sets cy.logout', () => {
    expect(addSpy).to.have.been.calledWith("logout")
  });

  it('Sets cy.callFirestore', () => {
    expect(addSpy).to.have.been.calledWith("callFirestore")
  });

  it('Sets cy.callRtdb', () => {
    expect(addSpy).to.have.been.calledWith("callRtdb")
  });
});