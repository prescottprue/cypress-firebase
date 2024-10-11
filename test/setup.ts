import chai from 'chai';
import sinonChai from 'sinon-chai';

const projectId = 'test-project';
const databaseEmulatorPort = 9000;
const firstoreEmulatorPort = 8080;
const databaseURL = `http://127.0.0.1:${databaseEmulatorPort}?ns=${projectId}`;

// Set environment variables
process.env.NODE_ENV = 'test';
process.env.GCLOUD_PROJECT = projectId;
process.env.FIREBASE_DATABASE_EMULATOR_HOST = `127.0.0.1:${databaseEmulatorPort}`;
process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${firstoreEmulatorPort}`;

chai.use(sinonChai);

// Set global variables
(global as any).projectId = projectId;
(global as any).databaseURL = databaseURL;
