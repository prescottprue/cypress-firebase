import sinon from 'sinon';
import { expect } from 'chai';
import pluginWithTasks from '../../src/plugin';
import { protectProduction } from '../../src/firebase-utils';

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

  describe('configuration', () => {
    describe('protectProduction', () => {
      it('Should error without emulators', () => {
        const initializeSpy = sinon.spy(() => ({}));
        const pluginWithProtectProduction =
          (protectProduction: protectProduction) => () =>
            pluginWithTasks(
              {} as Cypress.PluginEvents,
              {} as Cypress.PluginConfigOptions,
              {
                initializeApp: initializeSpy,
                apps: [],
                credential: {
                  cert: () => ({}),
                  applicationDefault: sinon.spy(),
                },
              },
              {},
              {
                protectProduction,
              },
            );

        process.env.FIREBASE_DATABASE_EMULATOR_HOST = '';
        expect(
          pluginWithProtectProduction({
            rtdb: 'error',
            firestore: 'none',
            auth: 'none',
          }),
        ).to.throw(
          'cypress-firebase: FIREBASE_DATABASE_EMULATOR_HOST is not set. Set FIREBASE_DATABASE_EMULATOR_HOST environment variable or change protectProduction.rtdb setting',
        );
        process.env.FIRESTORE_EMULATOR_HOST = '';
        expect(
          pluginWithProtectProduction({
            rtdb: 'none',
            firestore: 'error',
            auth: 'none',
          }),
        ).to.throw(
          'cypress-firebase: FIRESTORE_EMULATOR_HOST is not set. Set FIRESTORE_EMULATOR_HOST environment variable or change protectProduction.firestore setting',
        );
        process.env.FIREBASE_AUTH_EMULATOR_HOST = '';
        expect(
          pluginWithProtectProduction({
            rtdb: 'none',
            firestore: 'none',
            auth: 'error',
          }),
        ).to.throw(
          'cypress-firebase: FIREBASE_AUTH_EMULATOR_HOST is not set. Set FIREBASE_AUTH_EMULATOR_HOST environment variable or change protectProduction.auth setting',
        );
      });

      it('Should warn without emulators', () => {
        const consoleSpy = sinon.spy(console, 'warn');
        const onFuncSpy = sinon.spy();
        const initializeSpy = sinon.spy(() => ({}));
        const pluginWithProtectProduction = (
          protectProduction: protectProduction,
        ) =>
          pluginWithTasks(
            onFuncSpy,
            {} as Cypress.PluginConfigOptions,
            {
              initializeApp: initializeSpy,
              apps: [],
              credential: {
                cert: () => ({}),
                applicationDefault: sinon.spy(),
              },
              firestore: () => ({ settings: () => ({}) }),
            },
            {},
            {
              protectProduction,
            },
          );

        process.env.FIREBASE_DATABASE_EMULATOR_HOST = '';
        pluginWithProtectProduction({
          rtdb: 'warn',
          firestore: 'none',
          auth: 'none',
        });
        expect(consoleSpy).to.have.been.calledWith(
          'cypress-firebase: FIREBASE_DATABASE_EMULATOR_HOST is not set, RTDB operations may alter production instead of emulator!',
        );
        process.env.FIRESTORE_EMULATOR_HOST = '';
        pluginWithProtectProduction({
          rtdb: 'none',
          firestore: 'warn',
          auth: 'none',
        });
        expect(consoleSpy).to.have.been.calledWith(
          'cypress-firebase: FIRESTORE_EMULATOR_HOST is not set, Firestore operations may alter production instead of emulator!',
        );
        process.env.FIREBASE_AUTH_EMULATOR_HOST = '';
        pluginWithProtectProduction({
          rtdb: 'none',
          firestore: 'none',
          auth: 'warn',
        });
        expect(consoleSpy).to.have.been.calledWith(
          'cypress-firebase: FIREBASE_AUTH_EMULATOR_HOST is not set, auth operations may alter production instead of emulator!',
        );
      });

      it('Should work normally with everything set to none', () => {
        const onFuncSpy = sinon.spy();
        const initializeSpy = sinon.spy(() => ({}));

        process.env.FIREBASE_DATABASE_EMULATOR_HOST = '';
        process.env.FIRESTORE_EMULATOR_HOST = '';
        process.env.FIREBASE_AUTH_EMULATOR_HOST = '';

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
      });
    });
  });
});
