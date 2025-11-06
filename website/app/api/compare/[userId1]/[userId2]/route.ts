import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId1: string; userId2: string }> }
) {
  try {
    const { userId1, userId2 } = await params;
    const db = getDatabase();

    // Get both users' data
    const user1 = db.prepare(`
      SELECT user_id, xp, level, prestige, coins, reputation, total_text_xp, total_voice_xp, created_at
      FROM users
      WHERE user_id = ?
    `).get(userId1) as any;

    const user2 = db.prepare(`
      SELECT user_id, xp, level, prestige, coins, reputation, total_text_xp, total_voice_xp, created_at
      FROM users
      WHERE user_id = ?
    `).get(userId2) as any;

    if (!user1 || !user2) {
      return NextResponse.json(
        { success: false, error: 'One or both users not found' },
        { status: 404 }
      );
    }

    // Get statistics for both users
    const stats1 = db.prepare(`
      SELECT stat_type, period_type, period_key, value
      FROM statistics
      WHERE user_id = ? AND period_type = 'total' AND period_key = 'total'
    `).all(userId1) as any[];

    const stats2 = db.prepare(`
      SELECT stat_type, period_type, period_key, value
      FROM statistics
      WHERE user_id = ? AND period_type = 'total' AND period_key = 'total'
    `).all(userId2) as any[];

    // Get achievements for both users
    const achievements1 = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_achievements
      WHERE user_id = ?
    `).get(userId1) as any;

    const achievements2 = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_achievements
      WHERE user_id = ?
    `).get(userId2) as any;

    // Get streaks
    const streak1 = db.prepare(`
      SELECT current_streak, longest_streak
      FROM user_streaks
      WHERE user_id = ?
    `).get(userId1) as any;

    const streak2 = db.prepare(`
      SELECT current_streak, longest_streak
      FROM user_streaks
      WHERE user_id = ?
    `).get(userId2) as any;

    // Get rank settings for XP calculations
    const rankSettings = db.prepare('SELECT key, value FROM rank_settings').all()
      .reduce((acc: any, row: any) => {
        acc[row.key] = JSON.parse(row.value);
        return acc;
      }, {});

    const calculateRequiredXp = (level: number) => {
      if (level < 1) level = 1;
      const baseXp = rankSettings.formula?.baseXp || 100;
      const exponent = rankSettings.formula?.exponent || 1.5;
      return Math.floor(baseXp * Math.pow(level, exponent));
    };

    // Organize statistics
    const organizeStats = (stats: any[]) => {
      const result: any = {
        messages: 0,
        voice: 0,
        commands: 0,
      };
      for (const stat of stats) {
        if (stat.stat_type === 'messages') {
          result.messages = stat.value;
        } else if (stat.stat_type === 'voice') {
          result.voice = stat.value;
        } else if (stat.stat_type === 'commands') {
          result.commands = stat.value;
        }
      }
      return result;
    };

    const stats1Obj = organizeStats(stats1);
    const stats2Obj = organizeStats(stats2);

    // Calculate rankings
    const getRank = (userId: string, orderBy: string) => {
      const result = db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM users
        WHERE ${orderBy} > (SELECT ${orderBy} FROM users WHERE user_id = ?)
      `).get(userId) as any;
      return result.rank || 1;
    };

    const rank1 = {
      xp: getRank(userId1, 'xp'),
      level: getRank(userId1, 'level'),
      prestige: getRank(userId1, 'prestige'),
    };

    const rank2 = {
      xp: getRank(userId2, 'xp'),
      level: getRank(userId2, 'level'),
      prestige: getRank(userId2, 'prestige'),
    };

    // Calculate next level XP
    const nextLevelXp1 = calculateRequiredXp(user1.level + 1);
    const nextLevelXp2 = calculateRequiredXp(user2.level + 1);

    return NextResponse.json({
      success: true,
      data: {
        user1: {
          userId: user1.user_id,
          xp: user1.xp,
          level: user1.level,
          prestige: user1.prestige,
          coins: user1.coins,
          reputation: user1.reputation,
          totalTextXp: user1.total_text_xp || 0,
          totalVoiceXp: user1.total_voice_xp || 0,
          nextLevelXp: nextLevelXp1,
          statistics: stats1Obj,
          achievements: achievements1.count || 0,
          streak: streak1 ? {
            current: streak1.current_streak || 0,
            longest: streak1.longest_streak || 0,
          } : null,
          rank: rank1,
          createdAt: user1.created_at,
        },
        user2: {
          userId: user2.user_id,
          xp: user2.xp,
          level: user2.level,
          prestige: user2.prestige,
          coins: user2.coins,
          reputation: user2.reputation,
          totalTextXp: user2.total_text_xp || 0,
          totalVoiceXp: user2.total_voice_xp || 0,
          nextLevelXp: nextLevelXp2,
          statistics: stats2Obj,
          achievements: achievements2.count || 0,
          streak: streak2 ? {
            current: streak2.current_streak || 0,
            longest: streak2.longest_streak || 0,
          } : null,
          rank: rank2,
          createdAt: user2.created_at,
        },
        differences: {
          xp: user1.xp - user2.xp,
          level: user1.level - user2.level,
          prestige: user1.prestige - user2.prestige,
          coins: user1.coins - user2.coins,
          reputation: user1.reputation - user2.reputation,
          messages: stats1Obj.messages - stats2Obj.messages,
          voice: stats1Obj.voice - stats2Obj.voice,
          achievements: (achievements1.count || 0) - (achievements2.count || 0),
        },
      },
    });
  } catch (error) {
    console.error('Error comparing users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compare users' },
      { status: 500 }
    );
  }
}

