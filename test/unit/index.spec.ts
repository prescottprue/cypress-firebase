import { describe, expect, it } from 'vitest';
import { attachCustomCommands } from '../../src';
import extendWithFirebaseConfig from '../../src/extendWithFirebaseConfig';

describe('Main index', () => {
  it('Should export "attachCustomCommands" function', () => {
    expect(attachCustomCommands).toBeTypeOf('function');
  });

  it('Should export "extendWithFirebaseConfig" function', () => {
    expect(extendWithFirebaseConfig).toBeTypeOf('function');
  });
});
