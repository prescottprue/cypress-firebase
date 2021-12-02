import type { AppOptions } from 'firebase-admin';
import extendWithFirebaseConfig, {
  ExtendedCypressConfig,
} from './extendWithFirebaseConfig';
import * as tasks from './tasks';
import { initializeFirebase } from './firebase-utils';

type TaskKey =
  | 'callRtdb'
  | 'callFirestore'
  | 'createCustomToken'
  | 'getAuthUser';

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
 * @returns Extended Cypress config
 */
export default function pluginWithTasks(
  cypressOnFunc: Cypress.PluginEvents,
  cypressConfig: Cypress.PluginConfigOptions,
  adminInstance: any,
  overrideConfig?: AppOptions,
): ExtendedCypressConfig {
  // Only initialize admin instance if it hasn't already been initialized
  if (adminInstance.apps?.length === 0) {
    initializeFirebase(adminInstance, overrideConfig);
  }
  // Parse single argument from task into arguments for task methods while
  // also passing the admin instance
  type tasksType = Record<TaskKey, (taskSettings: any) => Promise<any>>;
  const tasksWithFirebase: tasksType = Object.keys(tasks).reduce(
    (acc, taskName: string) => {
      (acc as any)[taskName] = (taskSettings: any): any => {
        if (taskSettings?.uid) {
          return (tasks as any)[taskName](
            adminInstance,
            taskSettings.uid,
            taskSettings,
          );
        }
        const { action, path: actionPath, options = {}, data } = taskSettings;
        return (tasks as any)[taskName](
          adminInstance,
          action,
          actionPath,
          options,
          data,
        );
      };
      return acc;
    },
    {} as tasksType,
  );

  // Attach tasks to Cypress using on function
  cypressOnFunc('task', tasksWithFirebase);

  // Return extended config
  return extendWithFirebaseConfig(cypressConfig);
}
