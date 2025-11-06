/**
 * Unit tests for database functions
 */

const Database = require('better-sqlite3');
const path = require('node:path');
const fs = require('node:fs');
const {
  getDatabase,
  closeDatabase,
  initializeDatabase,
  getUserData,
  saveUserData,
  getRankSettings,
  saveRankSettings,
  calculateLevel,
  calculateRequiredXp
} = require('../../utils/database');

// Test database path
const TEST_DB_DIR = path.join(__dirname, '../../test-data');
const TEST_DB_FILE = path.join(TEST_DB_DIR, 'test-heaven.db');

// Clean up test database before and after tests
beforeAll(() => {
  // Ensure test directory exists
  if (!fs.existsSync(TEST_DB_DIR)) {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  }
  
  // Remove test database if exists
  if (fs.existsSync(TEST_DB_FILE)) {
    fs.unlinkSync(TEST_DB_FILE);
  }
  
  // Set test database path
  process.env.TEST_DB_FILE = TEST_DB_FILE;
});

afterAll(() => {
  // Close database connection
  closeDatabase();
  
  // Clean up test database
  if (fs.existsSync(TEST_DB_FILE)) {
    fs.unlinkSync(TEST_DB_FILE);
  }
  
  // Clean up test directory if empty
  try {
    fs.rmdirSync(TEST_DB_DIR);
  } catch (error) {
    // Directory not empty, ignore
  }
});

describe('Database Functions', () => {
  beforeEach(async () => {
    // Initialize fresh database for each test
    closeDatabase();
    if (fs.existsSync(TEST_DB_FILE)) {
      fs.unlinkSync(TEST_DB_FILE);
    }
    await initializeDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('getUserData', () => {
    test('should create default user data if user does not exist', async () => {
      const userId = '123456789012345678';
      const userData = await getUserData(userId);
      
      expect(userData).toHaveProperty('xp', 0);
      expect(userData).toHaveProperty('level', 1);
      expect(userData).toHaveProperty('prestige', 0);
      expect(userData).toHaveProperty('lastMessageTimestamp', 0);
      expect(userData).toHaveProperty('voiceJoinTimestamp', 0);
      expect(userData).toHaveProperty('totalTextXp', 0);
      expect(userData).toHaveProperty('totalVoiceXp', 0);
    });

    test('should retrieve existing user data', async () => {
      const userId = '123456789012345678';
      const testData = {
        xp: 1000,
        level: 5,
        prestige: 1,
        lastMessageTimestamp: Date.now(),
        voiceJoinTimestamp: 0,
        totalTextXp: 800,
        totalVoiceXp: 200
      };
      
      await saveUserData(userId, testData);
      const userData = await getUserData(userId);
      
      expect(userData.xp).toBe(testData.xp);
      expect(userData.level).toBe(testData.level);
      expect(userData.prestige).toBe(testData.prestige);
    });
  });

  describe('saveUserData', () => {
    test('should save user data correctly', async () => {
      const userId = '123456789012345678';
      const testData = {
        xp: 500,
        level: 3,
        prestige: 0,
        lastMessageTimestamp: Date.now(),
        voiceJoinTimestamp: 0,
        totalTextXp: 400,
        totalVoiceXp: 100
      };
      
      await saveUserData(userId, testData);
      const userData = await getUserData(userId);
      
      expect(userData.xp).toBe(testData.xp);
      expect(userData.level).toBe(testData.level);
    });
  });

  describe('calculateRequiredXp', () => {
    test('should calculate XP required for level 1', async () => {
      const xp = await calculateRequiredXp(1);
      expect(xp).toBeGreaterThan(0);
    });

    test('should calculate XP required for higher levels', async () => {
      const xp1 = await calculateRequiredXp(1);
      const xp10 = await calculateRequiredXp(10);
      
      expect(xp10).toBeGreaterThan(xp1);
    });
  });

  describe('calculateLevel', () => {
    test('should calculate level 1 for 0 XP', async () => {
      const level = await calculateLevel(0);
      expect(level).toBe(1);
    });

    test('should calculate correct level for given XP', async () => {
      const requiredXp = await calculateRequiredXp(5);
      const level = await calculateLevel(requiredXp);
      expect(level).toBe(5);
    });
  });

  describe('getRankSettings', () => {
    test('should return default rank settings', async () => {
      const settings = await getRankSettings();
      
      expect(settings).toHaveProperty('textXp');
      expect(settings).toHaveProperty('voiceXp');
      expect(settings).toHaveProperty('formula');
      expect(settings.textXp).toHaveProperty('baseAmount');
      expect(settings.textXp).toHaveProperty('cooldown');
      expect(settings.textXp).toHaveProperty('randomBonus');
    });
  });
});

