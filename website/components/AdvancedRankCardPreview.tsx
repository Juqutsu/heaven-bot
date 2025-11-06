'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { RankCardSettings } from '@/lib/rankCardDefaults';

interface AdvancedRankCardPreviewProps {
  username: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  prestige: number;
  prestigeName?: string | null;
  settings: RankCardSettings;
  avatarUrl?: string | null;
}

export function AdvancedRankCardPreview({
  username,
  level,
  xp,
  nextLevelXp,
  prestige,
  prestigeName,
  settings,
  avatarUrl,
}: AdvancedRankCardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: session } = useSession();
  const [avatarImage, setAvatarImage] = useState<HTMLImageElement | null>(null);

  // Load avatar image
  useEffect(() => {
    const imageUrl = avatarUrl || session?.user?.image;
    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      img.onload = () => setAvatarImage(img);
      img.onerror = () => setAvatarImage(null);
    } else {
      setAvatarImage(null);
    }
  }, [avatarUrl, session?.user?.image]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isVertical = settings.orientation === 'vertical';
    const width = isVertical ? 280 : 1000;
    const height = isVertical ? 1000 : 280;
    
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Helper function for rounded rectangles
    const roundedRect = (x: number, y: number, w: number, h: number, radius: number | number[]) => {
      let r: { tl: number; tr: number; br: number; bl: number };
      if (typeof radius === 'number') {
        r = { tl: radius, tr: radius, br: radius, bl: radius };
      } else if (Array.isArray(radius)) {
        r = { tl: radius[0], tr: radius[1], br: radius[2], bl: radius[3] };
      } else {
        r = { tl: 0, tr: 0, br: 0, bl: 0 };
      }
      
      ctx.beginPath();
      ctx.moveTo(x + r.tl, y);
      ctx.lineTo(x + w - r.tr, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
      ctx.lineTo(x + w, y + h - r.br);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
      ctx.lineTo(x + r.bl, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
      ctx.lineTo(x, y + r.tl);
      ctx.quadraticCurveTo(x, y, x + r.tl, y);
      ctx.closePath();
    };

    // Draw background
    if (settings.backgroundStyle === 'gradient') {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, settings.backgroundColor);
      gradient.addColorStop(1, settings.primaryColor + '40');
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = settings.backgroundColor;
    }
    roundedRect(0, 0, width, height, 16);
    ctx.fill();

    // Draw accent bar
    ctx.fillStyle = settings.primaryColor;
    ctx.globalAlpha = settings.accentBarOpacity;
    if (settings.accentBarPosition === 'left') {
      roundedRect(0, 0, settings.accentBarWidth, height, [16, 0, 0, 16]);
    } else if (settings.accentBarPosition === 'right') {
      roundedRect(width - settings.accentBarWidth, 0, settings.accentBarWidth, height, [0, 16, 16, 0]);
    } else if (settings.accentBarPosition === 'top') {
      roundedRect(0, 0, width, settings.accentBarWidth, [16, 16, 0, 0]);
    } else {
      roundedRect(0, height - settings.accentBarWidth, width, settings.accentBarWidth, [0, 0, 16, 16]);
    }
    ctx.fill();
    ctx.globalAlpha = 1;

    // Apply shadow if enabled
    if (settings.shadowEnabled) {
      ctx.shadowBlur = settings.shadowBlur;
      ctx.shadowOffsetX = settings.shadowOffsetX;
      ctx.shadowOffsetY = settings.shadowOffsetY;
      ctx.shadowColor = settings.shadowColor;
    }

    // Draw avatar
    if (settings.showAvatar && avatarImage) {
      const avatarX = settings.avatar.x;
      const avatarY = settings.avatar.y;
      const avatarSize = settings.avatarSize;

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();

      // Avatar border
      if (settings.avatarBorderWidth > 0) {
        ctx.strokeStyle = settings.avatarBorderColor;
        ctx.lineWidth = settings.avatarBorderWidth;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Reset shadow for text
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw username
    if (settings.showUsername) {
      ctx.font = `600 ${settings.usernameFontSize}px Arial`;
      ctx.textAlign = settings.usernameAlign;
      ctx.fillStyle = settings.usernameColor;
      const displayName = username.length > 18 ? username.substring(0, 18) + '...' : username;
      const usernameX = settings.usernameAlign === 'center' ? width / 2 : 
                        settings.usernameAlign === 'right' ? width - settings.username.x : 
                        settings.username.x;
      ctx.fillText(displayName, usernameX, settings.username.y);
    }

    // Draw prestige badge
    if (settings.showPrestige && prestige > 0 && prestigeName) {
      ctx.font = `${settings.prestigeFontSize}px Arial`;
      ctx.textAlign = settings.prestigeAlign;
      ctx.fillStyle = settings.prestigeColor;
      const prestigeX = settings.prestigeAlign === 'center' ? width / 2 : 
                        settings.prestigeAlign === 'right' ? width - settings.prestige.x : 
                        settings.prestige.x;
      ctx.fillText(`★ ${prestigeName}`, prestigeX, settings.prestige.y);
    }

    // Draw level indicator
    if (settings.showLevel) {
      // Level label
      ctx.font = `500 ${settings.levelLabelFontSize}px Arial`;
      ctx.textAlign = settings.levelAlign;
      ctx.fillStyle = '#9CA3AF';
      const levelX = settings.levelAlign === 'center' ? width / 2 : 
                     settings.levelAlign === 'right' ? width - settings.level.x : 
                     settings.level.x;
      ctx.fillText('LEVEL', levelX, settings.level.y - 8);

      // Level number
      ctx.font = `600 ${settings.levelFontSize}px Arial`;
      ctx.fillStyle = settings.levelColor;
      ctx.fillText(`${level}`, levelX, settings.level.y + 28);
    }

    // Draw XP info
    if (settings.showXpInfo) {
      ctx.font = `500 ${settings.xpFontSize}px Arial`;
      ctx.textAlign = settings.xpAlign;
      ctx.fillStyle = settings.xpTextColor;
      const xpX = settings.xpAlign === 'center' ? width / 2 : 
                   settings.xpAlign === 'right' ? width - settings.xpInfo.x : 
                   settings.xpInfo.x;
      ctx.fillText(`${xp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP`, xpX, settings.xpInfo.y);
    }

    // Draw progress bar
    if (settings.showProgressBar) {
      const barX = settings.progressBar.x;
      const barY = settings.progressBar.y;
      const barWidth = settings.progressBarWidth;
      const barHeight = settings.progressBarHeight;
      const cornerRadius = settings.progressBarStyle === 'rounded' ? barHeight / 2 : 0;

      // Calculate progress
      const currentLevelXp = level === 1 ? 0 : Math.floor(level * 100);
      const xpForThisLevel = xp - currentLevelXp;
      const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
      const progressPercent = xpNeededForNextLevel > 0 ? (xpForThisLevel / xpNeededForNextLevel) * 100 : 0;

      // Bar background
      roundedRect(barX, barY, barWidth, barHeight, cornerRadius);
      ctx.fillStyle = settings.progressBarBgColor;
      ctx.fill();

      // Progress fill
      const progressWidth = Math.max(1, (progressPercent / 100) * barWidth);
      if (progressWidth > 0) {
        if (settings.progressBarStyle === 'gradient') {
          const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
          gradient.addColorStop(0, settings.progressBarFillColor);
          gradient.addColorStop(1, settings.primaryColor);
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = settings.progressBarFillColor;
        }

        const topLeft = cornerRadius;
        const bottomLeft = cornerRadius;
        const topRight = progressWidth >= barWidth ? cornerRadius : 0;
        const bottomRight = progressWidth >= barWidth ? cornerRadius : 0;
        roundedRect(barX, barY, progressWidth, barHeight, [topLeft, topRight, bottomRight, bottomLeft]);
        ctx.fill();
      }

      // Percentage text
      if (settings.showProgressText) {
        ctx.font = `500 ${settings.progressBarTextFontSize}px Arial`;
        ctx.textAlign = settings.progressTextAlign;
        ctx.fillStyle = settings.progressBarTextColor;
        const textX = settings.progressTextAlign === 'center' ? barX + barWidth / 2 : 
                      settings.progressTextAlign === 'right' ? barX + barWidth - 8 : 
                      barX + 8;
        ctx.fillText(`${progressPercent.toFixed(1)}%`, textX, barY + barHeight - 6);
      }
    }
  }, [username, level, xp, nextLevelXp, prestige, prestigeName, settings, avatarImage]);

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
      <h3 className="text-lg font-semibold text-white mb-4">Live Preview</h3>
      <div className="flex justify-center overflow-x-auto">
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-[#40444b] shadow-lg max-w-full h-auto"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
    </div>
  );
}

