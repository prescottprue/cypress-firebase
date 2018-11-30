import attachCustomCommands from './attachCustomCommands';
import extendWithFirebaseConfig from './extendWithFirebaseConfig';

export const plugin = extendWithFirebaseConfig;
export { attachCustomCommands, extendWithFirebaseConfig }; // eslint-disable-line import/prefer-default-export
