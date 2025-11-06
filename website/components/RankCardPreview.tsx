'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

interface RankCardPreviewProps {
  username: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  prestige: number;
  prestigeName?: string | null;
  primaryColor: string;
  backgroundColor: string;
  progressPercent: number;
  avatarUrl?: string | null;
  orientation?: 'horizontal' | 'vertical';
}

export function RankCardPreview({
  username,
  level,
  xp,
  nextLevelXp,
  prestige,
  prestigeName,
  primaryColor,
  backgroundColor,
  progressPercent,
  avatarUrl,
  orientation = 'horizontal',
}: RankCardPreviewProps) {
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

    const isVertical = orientation === 'vertical';
    const width = isVertical ? 280 : 1000;
    const height = isVertical ? 1000 : 280;
    
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Helper function for rounded rectangles (matches bot's implementation)
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

    if (isVertical) {
      // Vertical layout
      const avatarSize = 200;
      const avatarX = (width - avatarSize) / 2;
      const avatarY = 40;

      // Draw background
      ctx.fillStyle = backgroundColor;
      roundedRect(0, 0, width, height, 16);
      ctx.fill();

      // Draw top accent bar
      ctx.fillStyle = primaryColor;
      ctx.globalAlpha = 0.15;
      roundedRect(0, 0, width, 4, [16, 16, 0, 0]);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Draw avatar
      if (avatarImage) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // Avatar border (3px, primaryColor)
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();
      }

      // Username (centered)
      const usernameY = avatarY + avatarSize + 40;
      ctx.font = '600 42px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      const displayName = username.length > 18 ? username.substring(0, 18) + '...' : username;
      ctx.fillText(displayName, width / 2, usernameY);

      // Prestige badge
      if (prestige > 0 && prestigeName) {
        ctx.font = '500 18px Arial';
        ctx.fillStyle = primaryColor;
        ctx.fillText(`★ ${prestigeName}`, width / 2, usernameY + 32);
      }

      // Level indicator (centered)
      const levelY = usernameY + 80;
      ctx.font = '500 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText('LEVEL', width / 2, levelY);

      ctx.font = '600 36px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${level}`, width / 2, levelY + 36);

      // XP info (centered)
      const xpY = levelY + 80;
      ctx.font = '500 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText(`${xp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP`, width / 2, xpY);

      // Progress bar
      const barWidth = width - 80;
      const barHeight = 24;
      const barX = 40;
      const barY = xpY + 40;
      const cornerRadius = barHeight / 2;

      // Bar background
      roundedRect(barX, barY, barWidth, barHeight, cornerRadius);
      ctx.fillStyle = '#374151';
      ctx.fill();

      // Progress fill
      const progressWidth = Math.max(1, (progressPercent / 100) * barWidth);
      if (progressWidth > 0) {
        const topLeft = cornerRadius;
        const bottomLeft = cornerRadius;
        const topRight = progressWidth >= barWidth ? cornerRadius : 0;
        const bottomRight = progressWidth >= barWidth ? cornerRadius : 0;
        roundedRect(barX, barY, progressWidth, barHeight, [topLeft, topRight, bottomRight, bottomLeft]);
        ctx.fillStyle = primaryColor;
        ctx.fill();
      }

      // Percentage
      ctx.font = '500 16px Arial';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText(`${progressPercent.toFixed(1)}%`, barX + barWidth - 8, barY + barHeight - 6);
    } else {
      // Horizontal layout (exact bot design)
      // Draw background
      ctx.fillStyle = backgroundColor;
      roundedRect(0, 0, width, height, 16);
      ctx.fill();

      // Draw left accent bar (4px wide, 0.15 alpha)
      ctx.fillStyle = primaryColor;
      ctx.globalAlpha = 0.15;
      roundedRect(0, 0, 4, height, [16, 0, 0, 16]);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Draw avatar (200x200 at 40, 40)
      const avatarSize = 200;
      const avatarX = 40;
      const avatarY = 40;

      if (avatarImage) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // Avatar border (3px, primaryColor)
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();
      }

      // Username (at 280, 100)
      ctx.font = '600 42px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF';
      const displayName = username.length > 18 ? username.substring(0, 18) + '...' : username;
      ctx.fillText(displayName, 280, 100);

      // Prestige badge (at 280, 132)
      if (prestige > 0 && prestigeName) {
        ctx.font = '500 18px Arial';
        ctx.fillStyle = primaryColor;
        ctx.fillText(`★ ${prestigeName}`, 280, 132);
      }

      // Level indicator (at 960, right-aligned)
      ctx.font = '500 14px Arial';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText('LEVEL', 960, 92);

      ctx.font = '600 36px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${level}`, 960, 128);

      // XP info (at 280, 140)
      ctx.font = '500 20px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText(`${xp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP`, 280, 140);

      // Progress bar (at 280, 180, width 680, height 24)
      const barX = 280;
      const barY = 180;
      const barWidth = 680;
      const barHeight = 24;
      const cornerRadius = barHeight / 2;

      // Bar background
      roundedRect(barX, barY, barWidth, barHeight, cornerRadius);
      ctx.fillStyle = '#374151';
      ctx.fill();

      // Progress fill
      const progressWidth = Math.max(1, (progressPercent / 100) * barWidth);
      if (progressWidth > 0) {
        const topLeft = cornerRadius;
        const bottomLeft = cornerRadius;
        const topRight = progressWidth >= barWidth ? cornerRadius : 0;
        const bottomRight = progressWidth >= barWidth ? cornerRadius : 0;
        roundedRect(barX, barY, progressWidth, barHeight, [topLeft, topRight, bottomRight, bottomLeft]);
        ctx.fillStyle = primaryColor;
        ctx.fill();
      }

      // Percentage (at barX + barWidth - 8, barY + barHeight - 6)
      ctx.font = '500 16px Arial';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText(`${progressPercent.toFixed(1)}%`, barX + barWidth - 8, barY + barHeight - 6);
    }
  }, [username, level, xp, nextLevelXp, prestige, prestigeName, primaryColor, backgroundColor, progressPercent, avatarImage, orientation]);

  return (
    <div className="bg-[#2f3136] rounded-lg p-6 border border-[#40444b] shadow-lg shadow-black/20">
      <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
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
