import { expect } from 'chai';
import extendWithFirebaseConfig, {
  type ExtendedCypressConfig,
} from '../../src/extendWithFirebaseConfig';

describe('extendWithFirebaseConfig', () => {
  const projectName = process.env.GCLOUD_PROJECT;
  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const databaseEmulatorHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;

  after(() => {
    process.env.GCLOUD_PROJECT = projectName;
    process.env.FIRESTORE_EMULATOR_HOST = firestoreEmulatorHost;
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = databaseEmulatorHost;
  });

  it('returns an object', () => {
    const originalConfig = {} as Cypress.PluginConfigOptions;
    expect(extendWithFirebaseConfig(originalConfig)).to.be.an('object');
  });

  it('attaches GCLOUD_PROJECT to cypress env', () => {
    const projectName = 'test-project';
    process.env.GCLOUD_PROJECT = projectName;
    const originalConfig = {} as Cypress.PluginConfigOptions;
    expect(extendWithFirebaseConfig(originalConfig)).to.have.nested.property(
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
    expect(extendWithFirebaseConfig(originalConfig)).to.have.nested.property(
      'env.GCLOUD_PROJECT',
      projectName,
    );
  });

  it('attaches FIREBASE_AUTH_EMULATOR_HOST to cypress env', () => {
    const emulatorHost = 'localhost:9000';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = emulatorHost;
    const originalConfig = {} as ExtendedCypressConfig;
    expect(extendWithFirebaseConfig(originalConfig)).to.have.nested.property(
      'env.FIREBASE_AUTH_EMULATOR_HOST',
      emulatorHost,
    );
  });

  it('attaches FIREBASE_DATABASE_EMULATOR_HOST to cypress env', () => {
    const emulatorHost = 'localhost:9000';
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = emulatorHost;
    const originalConfig = {} as ExtendedCypressConfig;
    expect(extendWithFirebaseConfig(originalConfig)).to.have.nested.property(
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
    expect(extendWithFirebaseConfig(originalConfig)).to.have.nested.property(
      'env.FIREBASE_DATABASE_EMULATOR_HOST',
      emulatorHost,
    );
  });

  it('attaches FIRESTORE_EMULATOR_HOST to cypress env', () => {
    const emulatorHost = 'localhost:8080';
    process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
    const originalConfig = {} as ExtendedCypressConfig;
    expect(extendWithFirebaseConfig(originalConfig)).to.have.nested.property(
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
    expect(extendWithFirebaseConfig(originalConfig)).to.have.nested.property(
      'env.FIRESTORE_EMULATOR_HOST',
      emulatorHost,
    );
  });
});
