import { expect } from 'chai';
import { attachCustomCommands } from '../../src';
import extendWithFirebaseConfig from '../../src/extendWithFirebaseConfig';

describe('Main index', () => {
  it('Should export "attachCustomCommands" function', () => {
    expect(attachCustomCommands).to.be.a('function');
  });

  it('Should export "extendWithFirebaseConfig" function', () => {
    expect(extendWithFirebaseConfig).to.be.a('function');
  });
});
