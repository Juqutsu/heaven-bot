import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// Helper function to calculate required XP for a level
function calculateRequiredXp(level: number, baseXp: number = 100, exponent: number = 1.5): number {
  if (level < 1) {
    level = 1;
  }
  return Math.floor(baseXp * Math.pow(level, exponent));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const db = getDatabase();
    const { userId } = await params;

    // Get user data
    const user = db.prepare(`
      SELECT * FROM users WHERE user_id = ?
    `).get(userId) as any;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get rank settings for XP calculation
    const rankSettingsRow = db.prepare(`
      SELECT value FROM rank_settings WHERE key = 'formula'
    `).get() as any;
    
    let baseXp = 100;
    let exponent = 1.5;
    if (rankSettingsRow) {
      const formula = JSON.parse(rankSettingsRow.value);
      baseXp = formula.baseXp || 100;
      exponent = formula.exponent || 1.5;
    }

    // Calculate next level XP
    const currentLevel = user.level;
    const currentLevelXp = currentLevel === 1 ? 0 : calculateRequiredXp(currentLevel, baseXp, exponent);
    const nextLevelXp = calculateRequiredXp(currentLevel + 1, baseXp, exponent);

    // Get prestige settings
    const prestigeRow = user.prestige > 0 ? db.prepare(`
      SELECT name, color FROM prestiges WHERE prestige_level = ?
    `).get(user.prestige) as any : null;

    // Get user statistics
    const stats = db.prepare(`
      SELECT stat_type, period_type, period_key, value
      FROM statistics
      WHERE user_id = ?
    `).all(userId) as any[];

    // Get user achievements
    const achievements = db.prepare(`
      SELECT 
        ua.achievement_id,
        ua.unlocked_at,
        a.name,
        a.description,
        a.icon,
        a.type
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.achievement_id
      WHERE ua.user_id = ?
      ORDER BY ua.unlocked_at DESC
    `).all(userId) as any[];

    // Get user inventory count
    const inventoryCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_inventory
      WHERE user_id = ?
    `).get(userId) as any;

    // Get recent statistics breakdown
    const statsObj: any = {
      messages: { total: 0, daily: {} },
      voice: { totalMinutes: 0, daily: {} },
      commands: { total: 0 },
    };

    for (const stat of stats) {
      if (stat.period_type === 'total' && stat.period_key === 'total') {
        if (stat.stat_type === 'messages') {
          statsObj.messages.total = stat.value;
        } else if (stat.stat_type === 'voice') {
          statsObj.voice.totalMinutes = stat.value;
        } else if (stat.stat_type === 'commands') {
          statsObj.commands.total = stat.value;
        }
      } else if (stat.period_type === 'daily') {
        if (stat.stat_type === 'messages') {
          statsObj.messages.daily[stat.period_key] = stat.value;
        } else if (stat.stat_type === 'voice') {
          statsObj.voice.daily[stat.period_key] = stat.value;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.user_id,
        xp: user.xp,
        level: user.level,
        prestige: user.prestige,
        prestigeName: prestigeRow?.name || null,
        coins: user.coins,
        reputation: user.reputation,
        totalTextXp: user.total_text_xp || 0,
        totalVoiceXp: user.total_voice_xp || 0,
        nextLevelXp: nextLevelXp,
        statistics: statsObj,
        achievements: achievements.map((ach: any) => ({
          id: ach.achievement_id,
          name: ach.name,
          description: ach.description,
          icon: ach.icon,
          type: ach.type,
          unlockedAt: ach.unlocked_at,
        })),
        inventoryCount: inventoryCount.count || 0,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}
