import { afterAll, describe, expect, it } from 'vitest';
import extendWithFirebaseConfig, {
  type ExtendedCypressConfig,
} from '../../src/extendWithFirebaseConfig';

describe('extendWithFirebaseConfig', () => {
  const projectName = process.env.GCLOUD_PROJECT;
  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const databaseEmulatorHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;

  afterAll(() => {
    process.env.GCLOUD_PROJECT = projectName;
    process.env.FIRESTORE_EMULATOR_HOST = firestoreEmulatorHost;
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = databaseEmulatorHost;
  });

  it('returns an object', () => {
    const originalConfig = {} as Cypress.PluginConfigOptions;
    expect(extendWithFirebaseConfig(originalConfig)).toBeTypeOf('object');
  });

  it('attaches GCLOUD_PROJECT to cypress env', () => {
    const projectName = 'test-project';
    process.env.GCLOUD_PROJECT = projectName;
    const originalConfig = {} as Cypress.PluginConfigOptions;
    expect(extendWithFirebaseConfig(originalConfig)).toHaveProperty(
      'env.GCLOUD_PROJECT',
      projectName,
    );
  });

  it('does not run over existing GCLOUD_PROJECT', () => {
    const projectName = 'test-project';
    process.env.GCLOUD_PROJECT = 'another-project';
    const originalConfig = {
      env: { GCLOUD_PROJECT: projectName },
    } as ExtendedCypressConfig;
    expect(extendWithFirebaseConfig(originalConfig)).toHaveProperty(
      'env.GCLOUD_PROJECT',
      projectName,
    );
  });

  it('attaches FIREBASE_AUTH_EMULATOR_HOST to cypress env', () => {
    const emulatorHost = 'localhost:9000';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = emulatorHost;
    const originalConfig = {} as ExtendedCypressConfig;
    expect(extendWithFirebaseConfig(originalConfig)).toHaveProperty(
      'env.FIREBASE_AUTH_EMULATOR_HOST',
      emulatorHost,
    );
  });

  it('attaches FIREBASE_DATABASE_EMULATOR_HOST to cypress env', () => {
    const emulatorHost = 'localhost:9000';
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = emulatorHost;
    const originalConfig = {} as ExtendedCypressConfig;
    expect(extendWithFirebaseConfig(originalConfig)).toHaveProperty(
      'env.FIREBASE_DATABASE_EMULATOR_HOST',
      emulatorHost,
    );
  });

  it('does not run over existing FIREBASE_DATABASE_EMULATOR_HOST', () => {
    const emulatorHost = 'localhost:9000';
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = 'localhost:1000';
    const originalConfig = {
      env: { FIREBASE_DATABASE_EMULATOR_HOST: emulatorHost },
    } as ExtendedCypressConfig;
    expect(extendWithFirebaseConfig(originalConfig)).toHaveProperty(
      'env.FIREBASE_DATABASE_EMULATOR_HOST',
      emulatorHost,
    );
  });

  it('attaches FIRESTORE_EMULATOR_HOST to cypress env', () => {
    const emulatorHost = 'localhost:8080';
    process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
    const originalConfig = {} as ExtendedCypressConfig;
    expect(extendWithFirebaseConfig(originalConfig)).toHaveProperty(
      'env.FIRESTORE_EMULATOR_HOST',
      emulatorHost,
    );
  });

  it('does not run over existing FIRESTORE_EMULATOR_HOST', () => {
    const emulatorHost = 'localhost:8081';
    process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
    const originalConfig = {
      env: { FIRESTORE_EMULATOR_HOST: emulatorHost },
    } as ExtendedCypressConfig;
    expect(extendWithFirebaseConfig(originalConfig)).toHaveProperty(
      'env.FIRESTORE_EMULATOR_HOST',
      emulatorHost,
    );
  });

  describe('expose (Cypress >= 15.10)', () => {
    it('attaches values to expose when Cypress version supports it', () => {
      const emulatorHost = 'localhost:8080';
      process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
      const originalConfig = {
        version: '15.10.0',
      } as ExtendedCypressConfig;
      expect(extendWithFirebaseConfig(originalConfig)).toHaveProperty(
        'expose.FIRESTORE_EMULATOR_HOST',
        emulatorHost,
      );
    });

    it('attaches values to expose on Cypress 16', () => {
      const emulatorHost = 'localhost:8080';
      process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
      const originalConfig = {
        version: '16.0.0',
      } as ExtendedCypressConfig;
      expect(extendWithFirebaseConfig(originalConfig)).toHaveProperty(
        'expose.FIRESTORE_EMULATOR_HOST',
        emulatorHost,
      );
    });

    it('does not attach expose for Cypress versions before 15.10', () => {
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      const originalConfig = {
        version: '15.9.2',
      } as ExtendedCypressConfig;
      expect(extendWithFirebaseConfig(originalConfig)).not.toHaveProperty(
        'expose',
      );
    });

    it('does not attach expose when Cypress version is unknown', () => {
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      const originalConfig = {} as ExtendedCypressConfig;
      expect(extendWithFirebaseConfig(originalConfig)).not.toHaveProperty(
        'expose',
      );
    });

    it('does not run over existing expose values', () => {
      const emulatorHost = 'localhost:8081';
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:1000';
      const originalConfig = {
        version: '16.0.0',
        expose: { FIRESTORE_EMULATOR_HOST: emulatorHost },
      } as ExtendedCypressConfig;
      expect(extendWithFirebaseConfig(originalConfig)).toHaveProperty(
        'expose.FIRESTORE_EMULATOR_HOST',
        emulatorHost,
      );
    });
  });
});
