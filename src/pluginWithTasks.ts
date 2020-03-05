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
  cypressOnFunc: Function,
  cypressConfig: any,
  adminInstance: any,
): ExtendedCypressConfig {
  // Parse single argument from task into arguments for task methods while
  // also passing the admin instance
  initializeFirebase(adminInstance);
  const tasksWithFirebase: Record<string, any> = {};
  Object.keys(tasks).forEach(taskName => {
    tasksWithFirebase[taskName] = (taskSettings: any): any => {
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

  // Enable cypress-firebase tasks support in custom commands
  const modifiedConfig = {
    ...cypressConfig,
    env: {
      ...(cypressConfig.env || {}),
      useCypressFirebaseTasks: true,
    },
  };

  // Return extended config
  return extendWithFirebaseConfig(modifiedConfig);
}
