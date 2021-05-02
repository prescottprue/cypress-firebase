import { expect } from 'chai';
import { isString } from '../../src/firebase-utils';

describe('firebase-utils', () => {
  describe('isString', () => {
    it('Should return true if input is a string', () => {
      expect(isString('')).to.be.true;
      expect(isString('asdfasdf')).to.be.true;
    });

    it('Should return true if input is an instance of String', () => {
      expect(isString(String('asdf'))).to.be.true;
    });

    it('Should return false if input is not a string', () => {
      expect(isString([])).to.be.false;
      expect(isString({})).to.be.false;
      expect(isString(new Date())).to.be.false;
    });
  });
});
