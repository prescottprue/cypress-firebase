import { expect } from 'chai';
import extendWithFirebaseConfig from '../../src/extendWithFirebaseConfig';

describe('extendWithFirebaseConfig', () => {
  it('returns an object', () => {
    const originalConfig = {};
    expect(extendWithFirebaseConfig(originalConfig)).to.be.an('object');
  });

  it('attaches GCLOUD_PROJECT to cypress env', () => {
    const projectName = 'test-project';
    process.env.GCLOUD_PROJECT = projectName;
    const originalConfig = {};
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
    };
    expect(extendWithFirebaseConfig(originalConfig)).to.have.nested.property(
      'env.GCLOUD_PROJECT',
      projectName,
    );
  });

  it('attaches FIREBASE_DATABASE_EMULATOR_HOST to cypress env', () => {
    const emulatorHost = 'localhost:9000';
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = emulatorHost;
    const originalConfig = {};
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
    };
    expect(extendWithFirebaseConfig(originalConfig)).to.have.nested.property(
      'env.FIREBASE_DATABASE_EMULATOR_HOST',
      emulatorHost,
    );
  });

  it('attaches FIRESTORE_EMULATOR_HOST to cypress env', () => {
    const emulatorHost = 'localhost:8080';
    process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
    const originalConfig = {};
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
    };
    expect(extendWithFirebaseConfig(originalConfig)).to.have.nested.property(
      'env.FIRESTORE_EMULATOR_HOST',
      emulatorHost,
    );
  });
});
