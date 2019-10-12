import { attachCustomCommands, extendWithFirebaseConfig } from '../../src';
import { expect } from 'chai';

describe('Main index', () => {
  it('Should export "attachCustomCommands" function', () => {
    expect(attachCustomCommands).to.be.a('function');
  });

  it('Should export "extendWithFirebaseConfig" function', () => {
    expect(extendWithFirebaseConfig).to.be.a('function');
  });
});