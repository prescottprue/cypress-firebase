import path from 'path';
import {
  FIREBASE_CONFIG_FILE_NAME,
  DEFAULT_TEST_FOLDER_PATH,
  DEFAULT_CONFIG_FILE_NAME,
  DEFAULT_TEST_ENV_FILE_NAME,
  DEFAULT_TEST_CONFIG_FILE_NAME,
} from './constants';

export const FIREBASE_CONFIG_FILE_PATH = path.join(
  process.cwd(),
  FIREBASE_CONFIG_FILE_NAME,
);
export const TEST_CONFIG_FILE_PATH = path.join(
  process.cwd(),
  DEFAULT_TEST_CONFIG_FILE_NAME,
);
export const TEST_ENV_FILE_PATH = path.join(
  process.cwd(),
  DEFAULT_TEST_ENV_FILE_NAME,
);
export const LOCAL_CONFIG_FILE_PATH = path.join(
  process.cwd(),
  DEFAULT_TEST_FOLDER_PATH,
  DEFAULT_CONFIG_FILE_NAME,
);
