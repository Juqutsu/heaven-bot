import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const db = getDatabase();

    // Get user statistics with daily, weekly, monthly data
    const stats = db.prepare(`
      SELECT stat_type, period_type, period_key, value
      FROM statistics
      WHERE user_id = ?
      ORDER BY period_type, period_key
    `).all(userId) as any[];

    // Get user data for XP progression
    const user = db.prepare(`
      SELECT xp, level, prestige, created_at, updated_at
      FROM users
      WHERE user_id = ?
    `).get(userId) as any;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get rank settings for XP calculations
    const rankSettings = db.prepare('SELECT key, value FROM rank_settings').all()
      .reduce((acc: any, row: any) => {
        acc[row.key] = JSON.parse(row.value);
        return acc;
      }, {});

    // Get streak data
    const streak = db.prepare(`
      SELECT current_streak, longest_streak, last_activity_date
      FROM user_streaks
      WHERE user_id = ?
    `).get(userId) as any;

    // Get total statistics
    const totalStats = db.prepare(`
      SELECT stat_type, value
      FROM statistics
      WHERE user_id = ? AND period_type = 'total' AND period_key = 'total'
    `).all(userId) as any[];

    const totalMessages = totalStats.find((s: any) => s.stat_type === 'messages')?.value || 0;
    const totalVoiceMinutes = totalStats.find((s: any) => s.stat_type === 'voice')?.value || 0;
    const totalCommands = totalStats.find((s: any) => s.stat_type === 'commands')?.value || 0;

    // Organize statistics by type and period
    const organizedStats: any = {
      messages: { daily: [], weekly: [], monthly: [], total: totalMessages },
      voice: { daily: [], weekly: [], monthly: [], totalMinutes: totalVoiceMinutes },
      commands: { daily: [], weekly: [], monthly: [], total: totalCommands },
    };

    for (const stat of stats) {
      if (stat.period_type === 'daily' && organizedStats[stat.stat_type]) {
        organizedStats[stat.stat_type].daily.push({
          date: stat.period_key,
          value: stat.value,
        });
      } else if (stat.period_type === 'weekly' && organizedStats[stat.stat_type]) {
        organizedStats[stat.stat_type].weekly.push({
          week: stat.period_key,
          value: stat.value,
        });
      } else if (stat.period_type === 'monthly' && organizedStats[stat.stat_type]) {
        organizedStats[stat.stat_type].monthly.push({
          month: stat.period_key,
          value: stat.value,
        });
      }
    }

    // Sort by date/week/month
    organizedStats.messages.daily.sort((a: any, b: any) => a.date.localeCompare(b.date));
    organizedStats.messages.weekly.sort((a: any, b: any) => a.week.localeCompare(b.week));
    organizedStats.messages.monthly.sort((a: any, b: any) => a.month.localeCompare(b.month));
    organizedStats.voice.daily.sort((a: any, b: any) => a.date.localeCompare(b.date));
    organizedStats.voice.weekly.sort((a: any, b: any) => a.week.localeCompare(b.week));
    organizedStats.voice.monthly.sort((a: any, b: any) => a.month.localeCompare(b.month));

    // Calculate XP progression timeline (last 30 days of daily stats)
    const calculateRequiredXp = (level: number) => {
      if (level < 1) level = 1;
      const baseXp = rankSettings.formula?.baseXp || 100;
      const exponent = rankSettings.formula?.exponent || 1.5;
      return Math.floor(baseXp * Math.pow(level, exponent));
    };

    const nextLevelXp = calculateRequiredXp(user.level + 1);
    const currentLevelXp = user.level === 1 ? 0 : calculateRequiredXp(user.level);
    const xpForThisLevel = user.xp - currentLevelXp;
    const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
    const progressPercent = xpNeededForNextLevel > 0 ? (xpForThisLevel / xpNeededForNextLevel) * 100 : 0;

    // Calculate activity heatmap data (last 365 days)
    const heatmapData: Record<string, number> = {};
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      heatmapData[dateStr] = 0;
    }

    // Fill in actual data
    for (const stat of stats) {
      if (stat.period_type === 'daily' && stat.stat_type === 'messages') {
        if (heatmapData.hasOwnProperty(stat.period_key)) {
          heatmapData[stat.period_key] = stat.value;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        level: user.level,
        xp: user.xp,
        prestige: user.prestige,
        nextLevelXp,
        progressPercent: Math.max(0, Math.min(100, progressPercent)),
        statistics: organizedStats,
        streak: streak ? {
          current: streak.current_streak || 0,
          longest: streak.longest_streak || 0,
          lastActivity: streak.last_activity_date || null,
        } : null,
        heatmapData: Object.entries(heatmapData).map(([date, value]) => ({
          date,
          value,
        })),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

