/**
 * Unit tests for leveling functions
 */

const {
  calculateRequiredXp,
  calculateLevel
} = require('../../utils/database');

describe('Leveling Calculations', () => {
  describe('calculateRequiredXp', () => {
    test('should return positive XP for valid levels', async () => {
      const xp = await calculateRequiredXp(1);
      expect(xp).toBeGreaterThan(0);
    });

    test('should return increasing XP for higher levels', async () => {
      const xp1 = await calculateRequiredXp(1);
      const xp5 = await calculateRequiredXp(5);
      const xp10 = await calculateRequiredXp(10);
      
      expect(xp5).toBeGreaterThan(xp1);
      expect(xp10).toBeGreaterThan(xp5);
    });

    test('should handle level 0 as level 1', async () => {
      const xp0 = await calculateRequiredXp(0);
      const xp1 = await calculateRequiredXp(1);
      expect(xp0).toBe(xp1);
    });
  });

  describe('calculateLevel', () => {
    test('should return level 1 for 0 XP', async () => {
      const level = await calculateLevel(0);
      expect(level).toBe(1);
    });

    test('should calculate correct level for XP', async () => {
      const requiredXp = await calculateRequiredXp(3);
      const level = await calculateLevel(requiredXp);
      expect(level).toBe(3);
    });

    test('should handle negative XP as 0', async () => {
      const level = await calculateLevel(-100);
      expect(level).toBe(1);
    });
  });
});

