/**
 * Rank card generation utilities
 * @module rankCard
 */

const { createCanvas, loadImage } = require('canvas');

/**
 * Draw rounded rectangle on canvas
 * @param {Object} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @param {number|Array} radius - Corner radius or array of corner radii
 */
function roundedRect(ctx, x, y, width, height, radius) {
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else if (Array.isArray(radius)) {
    radius = { tl: radius[0], tr: radius[1], br: radius[2], bl: radius[3] };
  } else {
    radius = { tl: 0, tr: 0, br: 0, bl: 0 };
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
}

/**
 * Lighten or darken a hex color
 * @param {string} color - Hex color
 * @param {number} percent - Percentage to lighten (positive) or darken (negative)
 * @returns {string} Modified color
 */
function shadeColor(color, percent) {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = parseInt((R * (100 + percent)) / 100);
  G = parseInt((G * (100 + percent)) / 100);
  B = parseInt((B * (100 + percent)) / 100);

  R = R < 255 ? R : 255;
  G = G < 255 ? G : 255;
  B = B < 255 ? B : 255;

  const RR = R.toString(16).length === 1 ? '0' + R.toString(16) : R.toString(16);
  const GG = G.toString(16).length === 1 ? '0' + G.toString(16) : G.toString(16);
  const BB = B.toString(16).length === 1 ? '0' + B.toString(16) : B.toString(16);

  return '#' + RR + GG + BB;
}

/**
 * Draw background and decorations
 * @param {Object} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {string} primaryColor - Primary color
 * @param {string} bgColor - Background color
 * @param {string} darkAccentColor - Dark accent color
 */
function drawBackground(ctx, width, height, primaryColor, bgColor, darkAccentColor) {
  // Draw clean rounded rectangle background
  ctx.fillStyle = bgColor;
  roundedRect(ctx, 0, 0, width, height, 16);
  ctx.fill();

  // Subtle left accent bar
  ctx.fillStyle = primaryColor;
  ctx.globalAlpha = 0.15;
  roundedRect(ctx, 0, 0, 4, height, [16, 0, 0, 16]);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * Draw user avatar
 * @param {Object} ctx - Canvas context
 * @param {Object} member - Discord guild member
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} size - Avatar size
 * @param {string} primaryColor - Primary color for border
 * @param {string} darkAccentColor - Dark accent color
 */
async function drawAvatar(ctx, member, x, y, size, primaryColor, darkAccentColor) {
  try {
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));

    // Draw circle avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, x, y, size, size);
    ctx.restore();

    // Draw minimal avatar border
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.stroke();
  } catch (error) {
    // Error loading avatar - continue without avatar
    // Logging is handled by caller if needed
  }
}

/**
 * Draw username and prestige badge
 * @param {Object} ctx - Canvas context
 * @param {string} username - Username
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} primaryColor - Primary color
 * @param {string} secondaryColor - Secondary color
 * @param {Object} prestige - Prestige information (optional)
 */
function drawUsername(ctx, username, x, y, primaryColor, secondaryColor, prestige = null) {
  // Truncate username if too long
  let displayName = username;
  if (displayName.length > 18) {
    displayName = displayName.substring(0, 18) + '...';
  }

  // Draw username - clean, no shadow
  ctx.font = '600 42px Arial';
  ctx.textAlign = 'left';
  ctx.fillStyle = secondaryColor;
  ctx.fillText(displayName, x, y);

  // Show prestige badge if applicable - minimal design
  if (prestige) {
    ctx.font = '500 18px Arial';
    ctx.fillStyle = primaryColor;
    ctx.fillText(`★ ${prestige.name}`, x, y + 32);
  }
}

/**
 * Draw level indicator
 * @param {Object} ctx - Canvas context
 * @param {number} level - User level
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} primaryColor - Primary color
 * @param {string} secondaryColor - Secondary color
 */
function drawLevelIndicator(ctx, level, x, y, primaryColor, secondaryColor) {
  // Draw minimal level text
  ctx.font = '500 14px Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText('LEVEL', x, y - 8);

  // Draw level number
  ctx.font = '600 36px Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = secondaryColor;
  ctx.fillText(`${level}`, x, y + 28);
}

/**
 * Draw XP information
 * @param {Object} ctx - Canvas context
 * @param {number} totalXp - Total XP
 * @param {number} nextLevelXp - XP needed for next level
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} secondaryColor - Secondary color
 */
function drawXpInfo(ctx, totalXp, nextLevelXp, x, y, secondaryColor) {
  // XP Info - minimal design
  ctx.textAlign = 'left';
  ctx.font = '500 20px Arial';
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText(`${totalXp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP`, x, y);
}

/**
 * Draw progress bar
 * @param {Object} ctx - Canvas context
 * @param {number} progressPercent - Progress percentage (0-100)
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Bar width
 * @param {number} height - Bar height
 * @param {string} primaryColor - Primary color
 * @param {string} lightAccentColor - Light accent color
 * @param {string} secondaryColor - Secondary color
 */
function drawProgressBar(ctx, progressPercent, x, y, width, height, primaryColor, lightAccentColor, secondaryColor) {
  const cornerRadius = height / 2;

  // Bar background with rounded corners
  ctx.beginPath();
  roundedRect(ctx, x, y, width, height, cornerRadius);
  ctx.fillStyle = lightAccentColor;
  ctx.fill();

  // Only draw progress if there is actual progress
  const progressWidth = Math.max(1, (progressPercent / 100) * width);

  if (progressWidth > 0) {
    ctx.beginPath();

    // Define corner radii explicitly
    const topLeft = cornerRadius;
    const bottomLeft = cornerRadius;
    const topRight = progressWidth >= width ? cornerRadius : 0;
    const bottomRight = progressWidth >= width ? cornerRadius : 0;

    // Draw progress bar with appropriate corners rounded
    roundedRect(ctx, x, y, progressWidth, height, [topLeft, topRight, bottomRight, bottomLeft]);

    // Clean solid color progress
    ctx.fillStyle = primaryColor;
    ctx.fill();
  }

  // Percentage display - minimal
  ctx.font = '500 16px Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText(`${progressPercent.toFixed(1)}%`, x + width - 8, y + height - 6);
}

module.exports = {
  roundedRect,
  shadeColor,
  drawBackground,
  drawAvatar,
  drawUsername,
  drawLevelIndicator,
  drawXpInfo,
  drawProgressBar
};

