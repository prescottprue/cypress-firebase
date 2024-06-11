import sinon from 'sinon';
import { expect } from 'chai';
import pluginWithTasks from '../../src/plugin';

describe('plugin', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('Should add tasks to cypress', () => {
    let assignedTasksObj;
    const onFuncSpy = sinon.spy((action, tasksObj) => {
      assignedTasksObj = tasksObj;
    });
    const results = pluginWithTasks(
      onFuncSpy,
      {} as Cypress.PluginConfigOptions,
      {},
    );
    expect(results).to.be.an('object');
    expect(onFuncSpy).to.have.been.calledOnceWith('task');
    expect(assignedTasksObj).to.have.property('callRtdb');
    (assignedTasksObj as any).callRtdb({});
  });

  it('Should initialize firebase if no apps exist', () => {
    const onFuncSpy = sinon.spy();
    const initializeSpy = sinon.spy(() => ({}));

    const results = pluginWithTasks(
      onFuncSpy,
      {} as Cypress.PluginConfigOptions,
      {
        initializeApp: initializeSpy,
        credential: { cert: () => ({}), applicationDefault: sinon.spy() },
        apps: [],
        firestore: () => ({ settings: () => ({}) }),
      },
    );
    expect(results).to.be.an('object');
    expect(onFuncSpy).to.have.been.calledOnceWith('task');
    // Not called if another test has already initialized firebase (in firebase-utils)
    // expect(initializeSpy).to.have.been.calledOnce;
  });

  it('Should pass uid as first argument to a task if it exists in settings', () => {
    let assignedTasksObj;
    const onFuncSpy = sinon.spy((action, tasksObj) => {
      assignedTasksObj = tasksObj;
    });
    const createCustomTokenSpy = sinon.spy(() => 'asdf');
    const results = pluginWithTasks(
      onFuncSpy,
      {} as Cypress.PluginConfigOptions,
      {
        auth: () => ({ createCustomToken: createCustomTokenSpy }),
      },
    );
    expect(results).to.be.an('object');
    expect(onFuncSpy).to.have.been.calledOnceWith('task');
    expect(assignedTasksObj).to.have.property('authCreateCustomToken');
    const uid = 'SomeUid';
    (assignedTasksObj as any).authCreateCustomToken({ uid });
    expect(createCustomTokenSpy).to.have.been.calledWith(uid);
  });
});
