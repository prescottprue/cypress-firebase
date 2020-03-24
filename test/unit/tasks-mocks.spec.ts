import { expect } from 'chai';
import sinon from 'sinon';
import * as tasks from '../../src/tasks';

let adminInstance: any;
let collectionSpy: any;
let rtdbRefSpy: any;
let rtdbVal: any;
let rtdbRemoveSpy: any;
let docSpy: any;
let rtdbValSpy: any;
let getSpy: any;
const firestoreData: any = {};

describe('tasks with mocks/spies', () => {
  beforeEach(() => {
    const createCustomTokenSpy = sinon.spy(() => Promise.resolve('someToken'));
    const authSpy = sinon.spy(() => ({
      createCustomToken: createCustomTokenSpy,
    }));
    getSpy = sinon.spy(
      (): Promise<any> => Promise.resolve({ data: () => firestoreData }),
    );
    docSpy = sinon.spy(() => ({
      get: getSpy,
    }));
    collectionSpy = sinon.spy(() => ({ doc: docSpy, get: getSpy }));
    const firestoreSpy = sinon.spy(() => ({
      collection: collectionSpy,
      doc: docSpy,
    }));
    const rtdbOnSpy = sinon.spy();
    rtdbVal = { some: 'value' };
    rtdbValSpy = sinon.spy(() => rtdbVal);
    const onceSpy = sinon.spy(
      (): Promise<any> => Promise.resolve({ val: rtdbValSpy }),
    );
    rtdbRemoveSpy = sinon.spy((): Promise<any> => Promise.resolve());
    rtdbRefSpy = sinon.spy(() => ({
      once: onceSpy,
      remove: rtdbRemoveSpy,
      on: rtdbOnSpy,
    }));
    const rtdbSpy = sinon.spy(() => ({
      ref: rtdbRefSpy,
    }));
    adminInstance = {
      auth: authSpy,
      firestore: firestoreSpy,
      database: rtdbSpy,
    };
  });

  describe('callFirestore', () => {
    it('is exported', () => {
      expect(tasks).to.have.property('callFirestore');
      expect(tasks.callFirestore).to.be.a('function');
    });
    it('returns a promise', () => {
      expect(
        tasks.callFirestore(adminInstance, 'get', 'some/path').then,
      ).to.be.a('function');
    });
    describe('get action', () => {
      it('gets collections', async () => {
        const result = await tasks.callFirestore(adminInstance, 'get', 'some');
        expect(collectionSpy).to.be.calledOnceWith('some');
        expect(getSpy).to.be.calledOnce;
        expect(result).to.be.equal(firestoreData);
      });

      it('gets documents', async () => {
        const result = await tasks.callFirestore(
          adminInstance,
          'get',
          'some/path',
        );
        expect(docSpy).to.be.calledOnceWith('some/path');
        expect(getSpy).to.be.calledOnce;
        expect(result).to.be.equal(firestoreData);
      });
    });
  });

  describe('callRtdb', () => {
    it('is exported', () => {
      expect(tasks).to.have.property('callRtdb');
      expect(tasks.callRtdb).to.be.a('function');
    });

    it('returns a promise', () => {
      expect(tasks.callRtdb(adminInstance, 'get', 'some/path').then).to.be.a(
        'function',
      );
    });

    describe('get action', () => {
      it('gets data', async () => {
        const result = await tasks.callRtdb(adminInstance, 'get', 'some/path');
        expect(rtdbRefSpy).to.have.been.calledOnceWith('some/path');
        expect(result).to.equal(rtdbVal);
      });
    });

    describe('remove action', () => {
      it('removes data', async () => {
        await tasks.callRtdb(adminInstance, 'remove', 'some/path');
        expect(rtdbRefSpy).to.have.been.calledOnceWith('some/path');
        expect(rtdbRemoveSpy).to.have.been.calledOnce;
      });

      it('supports "delete" action alias', async () => {
        await tasks.callRtdb(adminInstance, 'delete', 'some/path');
        expect(rtdbRefSpy).to.have.been.calledOnceWith('some/path');
        expect(rtdbRemoveSpy).to.have.been.calledOnce;
      });
    });
  });

  describe('createCustomToken', () => {
    it('is exported', () => {
      expect(tasks).to.have.property('createCustomToken');
      expect(tasks.createCustomToken).to.be.a('function');
    });
    it('returns a promise', () => {
      expect(tasks.createCustomToken(adminInstance, 'someuid').then).to.be.a(
        'function',
      );
    });
  });
});
