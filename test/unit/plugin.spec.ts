import sinon from 'sinon';
import { expect } from 'chai';
import { createCustomToken } from '../../src/tasks';
import pluginWithTasks from '../../src/plugin';

describe('plugin', () => {
  it('Should add tasks to cypress', () => {
    let assignedTasksObj;
    const onFuncSpy = sinon.spy((action, tasksObj) => {
      assignedTasksObj = tasksObj;
    });
    const results = pluginWithTasks(onFuncSpy, {}, {});
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
      {},
      {
        initializeApp: initializeSpy,
        apps: [],
        firestore: () => ({ settings: () => ({}) }),
      },
    );
    expect(results).to.be.an('object');
    expect(onFuncSpy).to.have.been.calledOnceWith('task');
    expect(initializeSpy).to.have.been.calledOnce;
  });

  it('Should pass uid as first argument to a task if it exists in settings', () => {
    let assignedTasksObj;
    const onFuncSpy = sinon.spy((action, tasksObj) => {
      assignedTasksObj = tasksObj;
    });
    const createCustomTokenSpy = sinon.spy(() => 'asdf');
    const results = pluginWithTasks(
      onFuncSpy,
      {},
      { auth: () => ({ createCustomToken: createCustomTokenSpy }) },
    );
    expect(results).to.be.an('object');
    expect(onFuncSpy).to.have.been.calledOnceWith('task');
    expect(assignedTasksObj).to.have.property('createCustomToken');
    const uid = 'SomeUid';
    (assignedTasksObj as any).createCustomToken({ uid });
    expect(createCustomTokenSpy).to.have.been.calledWith(uid);
  });
});