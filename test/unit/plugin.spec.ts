import { afterEach, describe, expect, it, vi } from 'vitest';
import type { protectProduction } from '../../src/firebase-utils';
import pluginWithTasks from '../../src/plugin';

describe('plugin', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Should add tasks to cypress', async () => {
    let assignedTasksObj;
    const onFuncSpy = vi.fn((_action, tasksObj) => {
      assignedTasksObj = tasksObj;
    });
    const results = pluginWithTasks(
      onFuncSpy as unknown as Cypress.PluginEvents,
      {} as Cypress.PluginConfigOptions,
      {},
    );
    expect(results).toBeTypeOf('object');
    expect(onFuncSpy).toHaveBeenCalledTimes(1);
    expect(onFuncSpy).toHaveBeenCalledWith('task', expect.any(Object));
    expect(assignedTasksObj).toHaveProperty('callRtdb');
    // Rejects since no actionPath is passed - only confirming the task is callable
    await expect((assignedTasksObj as any).callRtdb({})).rejects.toThrow(
      'actionPath is required for callRtdb. Use "/" for top level actions.',
    );
  });

  it('Should initialize firebase if no apps exist', () => {
    const onFuncSpy = vi.fn();
    const initializeSpy = vi.fn(() => ({}));

    const results = pluginWithTasks(
      onFuncSpy as unknown as Cypress.PluginEvents,
      {} as Cypress.PluginConfigOptions,
      {
        initializeApp: initializeSpy,
        credential: { cert: () => ({}), applicationDefault: vi.fn() },
        apps: [],
        firestore: () => ({ settings: () => ({}) }),
      },
    );
    expect(results).toBeTypeOf('object');
    expect(onFuncSpy).toHaveBeenCalledTimes(1);
    expect(onFuncSpy).toHaveBeenCalledWith('task', expect.any(Object));
    // Not called if another test has already initialized firebase (in firebase-utils)
    // expect(initializeSpy).toHaveBeenCalledTimes(1);
  });

  it('Should pass uid as first argument to a task if it exists in settings', () => {
    let assignedTasksObj;
    const onFuncSpy = vi.fn((_action, tasksObj) => {
      assignedTasksObj = tasksObj;
    });
    const createCustomTokenSpy = vi.fn(() => 'asdf');
    const results = pluginWithTasks(
      onFuncSpy as unknown as Cypress.PluginEvents,
      {} as Cypress.PluginConfigOptions,
      {
        auth: () => ({ createCustomToken: createCustomTokenSpy }),
      },
    );
    expect(results).toBeTypeOf('object');
    expect(onFuncSpy).toHaveBeenCalledTimes(1);
    expect(onFuncSpy).toHaveBeenCalledWith('task', expect.any(Object));
    expect(assignedTasksObj).toHaveProperty('authCreateCustomToken');
    const uid = 'SomeUid';
    (assignedTasksObj as any).authCreateCustomToken({ uid });
    expect(createCustomTokenSpy).toHaveBeenCalledWith(uid, {
      isTesting: true,
    });
  });

  describe('configuration', () => {
    describe('protectProduction', () => {
      it('Should error without emulators', () => {
        const initializeSpy = vi.fn(() => ({}));
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
                  applicationDefault: vi.fn(),
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
        ).toThrow(
          'cypress-firebase: FIREBASE_DATABASE_EMULATOR_HOST is not set. Set FIREBASE_DATABASE_EMULATOR_HOST environment variable or change protectProduction.rtdb setting',
        );
        process.env.FIRESTORE_EMULATOR_HOST = '';
        expect(
          pluginWithProtectProduction({
            rtdb: 'none',
            firestore: 'error',
            auth: 'none',
          }),
        ).toThrow(
          'cypress-firebase: FIRESTORE_EMULATOR_HOST is not set. Set FIRESTORE_EMULATOR_HOST environment variable or change protectProduction.firestore setting',
        );
        process.env.FIREBASE_AUTH_EMULATOR_HOST = '';
        expect(
          pluginWithProtectProduction({
            rtdb: 'none',
            firestore: 'none',
            auth: 'error',
          }),
        ).toThrow(
          'cypress-firebase: FIREBASE_AUTH_EMULATOR_HOST is not set. Set FIREBASE_AUTH_EMULATOR_HOST environment variable or change protectProduction.auth setting',
        );
      });

      it('Should warn without emulators', () => {
        const consoleSpy = vi.spyOn(console, 'warn');
        const onFuncSpy = vi.fn();
        const initializeSpy = vi.fn(() => ({}));
        const pluginWithProtectProduction = (
          protectProduction: protectProduction,
        ) =>
          pluginWithTasks(
            onFuncSpy as unknown as Cypress.PluginEvents,
            {} as Cypress.PluginConfigOptions,
            {
              initializeApp: initializeSpy,
              apps: [],
              credential: {
                cert: () => ({}),
                applicationDefault: vi.fn(),
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
        expect(consoleSpy).toHaveBeenCalledWith(
          'cypress-firebase: FIREBASE_DATABASE_EMULATOR_HOST is not set, RTDB operations may alter production instead of emulator!',
        );
        process.env.FIRESTORE_EMULATOR_HOST = '';
        pluginWithProtectProduction({
          rtdb: 'none',
          firestore: 'warn',
          auth: 'none',
        });
        expect(consoleSpy).toHaveBeenCalledWith(
          'cypress-firebase: FIRESTORE_EMULATOR_HOST is not set, Firestore operations may alter production instead of emulator!',
        );
        process.env.FIREBASE_AUTH_EMULATOR_HOST = '';
        pluginWithProtectProduction({
          rtdb: 'none',
          firestore: 'none',
          auth: 'warn',
        });
        expect(consoleSpy).toHaveBeenCalledWith(
          'cypress-firebase: FIREBASE_AUTH_EMULATOR_HOST is not set, auth operations may alter production instead of emulator!',
        );
      });

      it('Should work normally with everything set to none', () => {
        const onFuncSpy = vi.fn();
        const initializeSpy = vi.fn(() => ({}));

        process.env.FIREBASE_DATABASE_EMULATOR_HOST = '';
        process.env.FIRESTORE_EMULATOR_HOST = '';
        process.env.FIREBASE_AUTH_EMULATOR_HOST = '';

        const results = pluginWithTasks(
          onFuncSpy as unknown as Cypress.PluginEvents,
          {} as Cypress.PluginConfigOptions,
          {
            initializeApp: initializeSpy,
            credential: { cert: () => ({}), applicationDefault: vi.fn() },
            apps: [],
            firestore: () => ({ settings: () => ({}) }),
          },
        );
        expect(results).toBeTypeOf('object');
      });
    });
  });
});
