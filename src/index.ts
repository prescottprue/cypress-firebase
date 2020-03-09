import attachCustomCommands from './attachCustomCommands';
import extendWithFirebaseConfig from './extendWithFirebaseConfig';
import pluginWithTasks from './pluginWithTasks';

export const plugin = extendWithFirebaseConfig;

export { attachCustomCommands, extendWithFirebaseConfig, pluginWithTasks }; // eslint-disable-line import/prefer-default-export
