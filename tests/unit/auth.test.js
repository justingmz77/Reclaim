const { isValidYorkUEmail } = require('../../utils/auth');

describe('Authentication Module - Unit Tests', () => {
  describe('isValidYorkUEmail', () => {
    it('should accept valid YorkU emails', () => {
      expect(isValidYorkUEmail('student@my.yorku.ca')).toBe(true);
      expect(isValidYorkUEmail('john.doe@my.yorku.ca')).toBe(true);
      expect(isValidYorkUEmail('test123@my.yorku.ca')).toBe(true);
    });

    it('should accept YorkU emails with different casing', () => {
      expect(isValidYorkUEmail('STUDENT@MY.YORKU.CA')).toBe(true);
      expect(isValidYorkUEmail('Student@My.YorkU.Ca')).toBe(true);
    });

    it('should reject non-YorkU emails', () => {
      expect(isValidYorkUEmail('student@gmail.com')).toBe(false);
      expect(isValidYorkUEmail('student@yorku.ca')).toBe(false);
      expect(isValidYorkUEmail('student@my.yorku.com')).toBe(false);
      expect(isValidYorkUEmail('student@yahoo.com')).toBe(false);
    });

    it('should reject empty or invalid inputs', () => {
      expect(isValidYorkUEmail('')).toBe(false);
      expect(isValidYorkUEmail('notanemail')).toBe(false);
    });
  });
});
