/**
 * Default rank card settings matching website design
 */
const DEFAULT_RANK_CARD_SETTINGS = {
  // Colors
  primaryColor: '#5865F2',
  backgroundColor: '#1F2937',
  usernameColor: '#FFFFFF',
  prestigeColor: '#5865F2',
  levelColor: '#FFFFFF',
  xpTextColor: '#9CA3AF',
  progressBarFillColor: '#5865F2',
  progressBarBgColor: '#374151',
  progressBarTextColor: '#9CA3AF',
  
  // Positions (horizontal layout - 1000x280)
  avatar: { x: 40, y: 40 },
  username: { x: 280, y: 100 },
  prestige: { x: 280, y: 132 },
  level: { x: 960, y: 100 },
  xpInfo: { x: 280, y: 160 },
  progressBar: { x: 280, y: 200 },
  
  // Sizes
  avatarSize: 200,
  usernameFontSize: 42,
  prestigeFontSize: 18,
  levelFontSize: 36,
  levelLabelFontSize: 14,
  xpFontSize: 20,
  progressBarWidth: 680,
  progressBarHeight: 24,
  progressBarTextFontSize: 16,
  
  // Visibility
  showAvatar: true,
  showUsername: true,
  showPrestige: true,
  showLevel: true,
  showXpInfo: true,
  showProgressBar: true,
  showProgressText: true,
  
  // Text alignment
  usernameAlign: 'left',
  prestigeAlign: 'left',
  levelAlign: 'right',
  xpAlign: 'left',
  progressTextAlign: 'right',
  
  // Avatar
  avatarBorderWidth: 3,
  avatarBorderColor: '#5865F2',
  
  // Progress bar
  progressBarStyle: 'rounded',
  
  // Background
  backgroundStyle: 'solid',
  accentBarPosition: 'left',
  accentBarWidth: 4,
  accentBarOpacity: 0.15,
  
  // Effects
  shadowEnabled: false,
  shadowBlur: 10,
  shadowOffsetX: 0,
  shadowOffsetY: 4,
  shadowColor: '#000000',
  
  // Orientation
  orientation: 'horizontal',
};

/**
 * Merge user settings with defaults
 * @param {Object} userSettings - User's custom settings
 * @returns {Object} Merged settings
 */
function mergeWithDefaults(userSettings = {}) {
  const merged = { ...DEFAULT_RANK_CARD_SETTINGS };
  
  // Merge top-level properties
  Object.keys(userSettings).forEach(key => {
    if (key === 'avatar' || key === 'username' || key === 'prestige' || 
        key === 'level' || key === 'xpInfo' || key === 'progressBar') {
      // Merge position objects
      merged[key] = { ...merged[key], ...(userSettings[key] || {}) };
    } else {
      merged[key] = userSettings[key] !== undefined ? userSettings[key] : merged[key];
    }
  });
  
  return merged;
}

module.exports = {
  DEFAULT_RANK_CARD_SETTINGS,
  mergeWithDefaults
};

