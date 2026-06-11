import type { AppOptions } from 'firebase-admin/app';
import extendWithFirebaseConfig, {
  type ExtendedCypressConfig,
} from './extendWithFirebaseConfig';
import {
  adaptModularAdmin,
  initializeFirebase,
  isModularAdmin,
  type protectProduction,
} from './firebase-utils';
import type { TaskName } from './tasks';
import tasks, {
  type TaskNameToParams,
  type TaskNameToReturn,
  taskSettingKeys,
} from './tasks';

export type PluginConfig = {
  protectProduction?: protectProduction;
};

/**
 * Cypress plugin which attaches tasks used by custom commands
 * and returns modified Cypress config. Modified config includes
 * env setting with values of Firebase specific environment variables
 * such as GCLOUD_PROJECT, FIREBASE_DATABASE_EMULATOR_HOST,
 * FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST.
 * @param cypressOnFunc - on function from cypress plugins file
 * @param cypressConfig - Cypress config
 * @param adminInstance - firebase-admin instance
 * @param overrideConfig - Override config for firebase instance
 * @param pluginConfig - Plugin config
 * @returns Extended Cypress config
 */
export default function pluginWithTasks(
  cypressOnFunc: Cypress.PluginEvents,
  cypressConfig: Cypress.PluginConfigOptions,
  adminInstance: any,
  overrideConfig?: AppOptions,
  pluginConfig?: PluginConfig,
): ExtendedCypressConfig {
  // Adapt modular firebase-admin (v14+) to the legacy namespaced shape used
  // by tasks so the same code works across firebase-admin versions
  const admin = isModularAdmin(adminInstance)
    ? adaptModularAdmin(adminInstance)
    : adminInstance;
  // Only initialize admin instance if it hasn't already been initialized
  if (admin.apps && admin.apps.length === 0) {
    initializeFirebase(
      admin,
      overrideConfig,
      pluginConfig && pluginConfig.protectProduction,
    );
  }
  // Parse single argument from task into arguments for task methods while
  // also passing the admin instance
  type tasksType = {
    [TN in TaskName]: (
      taskSettings: TaskNameToParams<TN>,
    ) => TaskNameToReturn<TN>;
  };
  const tasksWithFirebase: tasksType = (
    Object.keys(tasks) as TaskName[]
  ).reduce((acc, taskName) => {
    acc[taskName] = (taskSettings: any = {}): any => {
      const taskArgs = taskSettingKeys[taskName].map(
        (sk: string) => taskSettings[sk],
      );
      // @ts-expect-error - TS cannot know that the right amount of args are passed
      return tasks[taskName](admin, ...taskArgs);
    };
    return acc;
  }, {} as tasksType);

  // Attach tasks to Cypress using on function
  cypressOnFunc('task', tasksWithFirebase);

  // Return extended config
  return extendWithFirebaseConfig(cypressConfig);
}
