import { expect } from 'chai';
import sinon from 'sinon';
import buildFirestoreCommand from '../../src/buildFirestoreCommand';

const addSpy = sinon.spy();
const envSpy = sinon.spy();
const Cypress = { Commands: { add: addSpy }, env: envSpy };

const firebaseExtraPath = 'npx firebase-extra';
const firebaseToolsPath = 'npx firebase';

describe('buildFirestoreCommand', () => {
  describe('get', () => {
    it('calls get with a path', () => {
      const actionPath = 'some/path';
      expect(buildFirestoreCommand(Cypress, 'get', actionPath)).to.equal(
        `${firebaseExtraPath} firestore get ${actionPath}`,
      );
    });
  });

  describe('set', () => {
    it('creates a set command with path and object data', () => {
      const actionPath = 'some/path';
      const data = { some: 'other' };
      expect(buildFirestoreCommand(Cypress, 'set', actionPath, data)).to.equal(
        `${firebaseExtraPath} firestore set ${actionPath} '${JSON.stringify(
          data,
        )}'`,
      );
    });

    it('creates a set command with path, object data, and withMeta flag', () => {
      const actionPath = 'some/path';
      const data = { some: 'other' };
      expect(
        buildFirestoreCommand(Cypress, 'set', actionPath, data, {
          withMeta: true,
        }),
      ).to.equal(
        `${firebaseExtraPath} firestore set ${actionPath} '${JSON.stringify(
          data,
        )}' -m`,
      );
    });

    it('creates a set command with path, fixture path, and withMeta flag', () => {
      const actionPath = 'some/path';
      const action = 'set';
      const fixturePath = 'some/fixture';
      expect(
        buildFirestoreCommand(Cypress, action, actionPath, fixturePath, {
          withMeta: true,
        }),
      ).to.equal(
        `${firebaseExtraPath} firestore ${action} ${actionPath} ${fixturePath} -m`,
      );
    });
  });

  describe('update', () => {
    it('calls update with a path', () => {
      const actionPath = 'some/path';
      const action = 'update';
      const data = { some: 'other' };
      expect(buildFirestoreCommand(Cypress, action, actionPath, data)).to.equal(
        `${firebaseExtraPath} firestore ${action} ${actionPath} '${JSON.stringify(
          data,
        )}'`,
      );
    });
  });

  describe('delete', () => {
    it('calls delete with a path and --shallow by default', () => {
      const actionPath = 'some/path';
      expect(buildFirestoreCommand(Cypress, 'delete', actionPath)).to.equal(
        `${firebaseToolsPath} firestore:delete ${actionPath} -y --shallow`,
      );
    });

    it('supports recursive delete (by passing -r flag)', () => {
      const actionPath = 'some/path';
      expect(
        buildFirestoreCommand(Cypress, 'delete', actionPath, {
          recursive: true,
        }),
      ).to.equal(`${firebaseToolsPath} firestore:delete ${actionPath} -y -r`);
    });

    it('creates command which calls firebase-extra if emulator is enabled', () => {
      const actionPath = 'some/path';
      expect(
        buildFirestoreCommand(
          {
            ...Cypress,
            env: (envVarName?: string) => {
              if (envVarName === 'FIRESTORE_EMULATOR_HOST') {
                return true;
              }
            },
          },
          'delete',
          actionPath,
          {
            recursive: true,
          },
        ),
      ).to.equal(`npx firebase-extra firestore delete ${actionPath} -y -r`);
    });
  });
});
