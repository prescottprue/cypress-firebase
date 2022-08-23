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
    const results = pluginWithTasks(onFuncSpy, {});
    expect(results).to.be.an('object');
    expect(onFuncSpy).to.have.been.calledOnceWith('task');
    expect(assignedTasksObj).to.have.property('callRtdb');
    (assignedTasksObj as any).callRtdb({});
  });
});
