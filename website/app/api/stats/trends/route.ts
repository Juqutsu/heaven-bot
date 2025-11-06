import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const db = getDatabase();

    // Get daily statistics for the last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get daily message stats
    const dailyMessages = db.prepare(`
      SELECT period_key, SUM(value) as total
      FROM statistics
      WHERE stat_type = 'messages' 
        AND period_type = 'daily'
        AND period_key >= date('now', '-30 days')
      GROUP BY period_key
      ORDER BY period_key
    `).all() as any[];

    // Get daily voice stats
    const dailyVoice = db.prepare(`
      SELECT period_key, SUM(value) as total
      FROM statistics
      WHERE stat_type = 'voice'
        AND period_type = 'daily'
        AND period_key >= date('now', '-30 days')
      GROUP BY period_key
      ORDER BY period_key
    `).all() as any[];

    // Get weekly statistics for the last 12 weeks
    const weeklyMessages = db.prepare(`
      SELECT period_key, SUM(value) as total
      FROM statistics
      WHERE stat_type = 'messages'
        AND period_type = 'weekly'
      GROUP BY period_key
      ORDER BY period_key DESC
      LIMIT 12
    `).all() as any[];

    const weeklyVoice = db.prepare(`
      SELECT period_key, SUM(value) as total
      FROM statistics
      WHERE stat_type = 'voice'
        AND period_type = 'weekly'
      GROUP BY period_key
      ORDER BY period_key DESC
      LIMIT 12
    `).all() as any[];

    // Get monthly statistics
    const monthlyMessages = db.prepare(`
      SELECT period_key, SUM(value) as total
      FROM statistics
      WHERE stat_type = 'messages'
        AND period_type = 'monthly'
      GROUP BY period_key
      ORDER BY period_key DESC
      LIMIT 12
    `).all() as any[];

    const monthlyVoice = db.prepare(`
      SELECT period_key, SUM(value) as total
      FROM statistics
      WHERE stat_type = 'voice'
        AND period_type = 'monthly'
      GROUP BY period_key
      ORDER BY period_key DESC
      LIMIT 12
    `).all() as any[];

    // Get user growth (users created per month)
    const userGrowth = db.prepare(`
      SELECT 
        strftime('%Y-%m', datetime(created_at, 'unixepoch')) as month,
        COUNT(*) as count
      FROM users
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).all() as any[];

    // Get peak activity times (hourly distribution from created_at timestamps)
    // This is a simplified version - in a real system you'd track activity timestamps
    const peakActivity = db.prepare(`
      SELECT 
        strftime('%H', datetime(updated_at, 'unixepoch')) as hour,
        COUNT(*) as activity_count
      FROM users
      WHERE updated_at > strftime('%s', 'now', '-7 days')
      GROUP BY hour
      ORDER BY hour
    `).all() as any[];

    // Calculate trends (compare last period to previous period)
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const messagesTrend = dailyMessages.length >= 2
      ? calculateTrend(
          dailyMessages[dailyMessages.length - 1]?.total || 0,
          dailyMessages[dailyMessages.length - 2]?.total || 0
        )
      : 0;

    const voiceTrend = dailyVoice.length >= 2
      ? calculateTrend(
          dailyVoice[dailyVoice.length - 1]?.total || 0,
          dailyVoice[dailyVoice.length - 2]?.total || 0
        )
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        daily: {
          messages: dailyMessages.map((d: any) => ({
            date: d.period_key,
            value: d.total || 0,
          })),
          voice: dailyVoice.map((d: any) => ({
            date: d.period_key,
            value: d.total || 0,
          })),
        },
        weekly: {
          messages: weeklyMessages.reverse().map((w: any) => ({
            week: w.period_key,
            value: w.total || 0,
          })),
          voice: weeklyVoice.reverse().map((w: any) => ({
            week: w.period_key,
            value: w.total || 0,
          })),
        },
        monthly: {
          messages: monthlyMessages.reverse().map((m: any) => ({
            month: m.period_key,
            value: m.total || 0,
          })),
          voice: monthlyVoice.reverse().map((m: any) => ({
            month: m.period_key,
            value: m.total || 0,
          })),
        },
        userGrowth: userGrowth.reverse().map((u: any) => ({
          month: u.month,
          count: u.count || 0,
        })),
        peakActivity: peakActivity.map((p: any) => ({
          hour: parseInt(p.hour || '0'),
          count: p.activity_count || 0,
        })),
        trends: {
          messages: messagesTrend,
          voice: voiceTrend,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}

