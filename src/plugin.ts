import extendWithFirebaseConfig, {
  ExtendedCypressConfig,
} from './extendWithFirebaseConfig';
import * as tasks from './tasks';
import { initializeFirebase } from './firebase-utils';

/**
 * @param cypressOnFunc - on function from cypress plugins file
 * @param cypressConfig - Cypress config
 * @param adminInstance - firebase-admin instance
 * @returns Extended Cypress config
 */
export default function pluginWithTasks(
  cypressOnFunc: any,
  cypressConfig: any,
  adminInstance: any,
): ExtendedCypressConfig {
  // Only initialize admin instance if it hasn't already been initialized
  if (adminInstance.apps.length === 0) {
    initializeFirebase(adminInstance);
  }
  // Parse single argument from task into arguments for task methods while
  // also passing the admin instance
  const tasksWithFirebase: Record<string, (taskSettings: any) => any> = {};
  Object.keys(tasks).forEach((taskName) => {
    tasksWithFirebase[taskName] = (taskSettings: any): any => {
      if (taskSettings?.uid) {
        return tasks.createCustomToken(
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
  });

  // Attach tasks to Cypress using on function
  cypressOnFunc('task', tasksWithFirebase);

  // Return extended config
  return extendWithFirebaseConfig(cypressConfig);
}
