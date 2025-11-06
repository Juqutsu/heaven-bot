import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    
    // Get aggregate user stats
    const userStats = db.prepare(`
      SELECT 
        COUNT(*) as total_users,
        SUM(xp) as total_xp,
        AVG(level) as avg_level,
        MAX(level) as max_level,
        SUM(coins) as total_coins,
        AVG(prestige) as avg_prestige,
        MAX(prestige) as max_prestige
      FROM users
    `).get() as any;

    // Get total messages
    const messageStats = db.prepare(`
      SELECT SUM(value) as total_messages
      FROM statistics
      WHERE stat_type = 'messages' AND period_type = 'total' AND period_key = 'total'
    `).get() as any;

    // Get total voice minutes
    const voiceStats = db.prepare(`
      SELECT SUM(value) as total_voice_minutes
      FROM statistics
      WHERE stat_type = 'voice' AND period_type = 'total' AND period_key = 'total'
    `).get() as any;

    // Get top 5 users
    const topUsers = db.prepare(`
      SELECT user_id, xp, level, prestige
      FROM users
      ORDER BY prestige DESC, level DESC, xp DESC
      LIMIT 5
    `).all() as any[];

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: userStats.total_users || 0,
          averageLevel: Math.round(userStats.avg_level || 0),
          maxLevel: userStats.max_level || 0,
          averagePrestige: Math.round(userStats.avg_prestige || 0),
          maxPrestige: userStats.max_prestige || 0,
        },
        xp: {
          total: userStats.total_xp || 0,
        },
        coins: {
          total: userStats.total_coins || 0,
        },
        messages: {
          total: messageStats.total_messages || 0,
        },
        voice: {
          totalMinutes: voiceStats.total_voice_minutes || 0,
        },
        topUsers: topUsers.map((user: any) => ({
          userId: user.user_id,
          xp: user.xp,
          level: user.level,
          prestige: user.prestige,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching server stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch server statistics' },
      { status: 500 }
    );
  }
}

