/**
 * Unit tests for validation functions
 */

const {
  sanitizeString,
  validateUserId,
  validateChannelId,
  validateInteger,
  validateHexColor,
  validateBugReport
} = require('../../utils/validation');

describe('Validation Functions', () => {
  describe('sanitizeString', () => {
    test('should remove null bytes', () => {
      const input = 'test\x00string';
      const result = sanitizeString(input);
      expect(result).not.toContain('\x00');
    });

    test('should limit string length', () => {
      const input = 'a'.repeat(2000);
      const result = sanitizeString(input, 100);
      expect(result.length).toBe(100);
    });

    test('should trim whitespace', () => {
      const input = '  test  ';
      const result = sanitizeString(input);
      expect(result).toBe('test');
    });
  });

  describe('validateUserId', () => {
    test('should validate correct Discord user ID', () => {
      const validId = '123456789012345678';
      expect(validateUserId(validId)).toBe(validId);
    });

    test('should reject invalid user ID', () => {
      expect(validateUserId('invalid')).toBeNull();
      expect(validateUserId('123')).toBeNull();
      expect(validateUserId('')).toBeNull();
    });
  });

  describe('validateInteger', () => {
    test('should validate integer within range', () => {
      expect(validateInteger(5, 1, 10)).toBe(5);
    });

    test('should reject integer outside range', () => {
      expect(validateInteger(15, 1, 10)).toBeNull();
      expect(validateInteger(0, 1, 10)).toBeNull();
    });

    test('should reject non-integer', () => {
      expect(validateInteger(5.5, 1, 10)).toBeNull();
      expect(validateInteger('5', 1, 10)).toBeNull();
    });
  });

  describe('validateHexColor', () => {
    test('should validate correct hex color', () => {
      expect(validateHexColor('#FF0000')).toBe('#FF0000');
      expect(validateHexColor('#00ff00')).toBe('#00FF00');
    });

    test('should reject invalid hex color', () => {
      expect(validateHexColor('FF0000')).toBeNull();
      expect(validateHexColor('#FF00')).toBeNull();
      expect(validateHexColor('#GGGGGG')).toBeNull();
    });
  });

  describe('validateBugReport', () => {
    test('should validate correct bug report', () => {
      const result = validateBugReport(
        'Test Bug Title',
        'This is a detailed bug description with enough text',
        'Steps to reproduce'
      );
      expect(result.isValid).toBe(true);
      expect(result.title).toBe('Test Bug Title');
    });

    test('should reject bug report with short title', () => {
      const result = validateBugReport('Test', 'Description', 'Steps');
      expect(result.isValid).toBe(false);
    });

    test('should reject bug report with short description', () => {
      const result = validateBugReport('Test Title', 'Short', 'Steps');
      expect(result.isValid).toBe(false);
    });
  });
});

