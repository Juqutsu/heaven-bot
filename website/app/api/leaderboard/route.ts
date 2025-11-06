import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const maxLimit = Math.min(limit, 100); // Cap at 100

    const db = getDatabase();
    
    const rows = db.prepare(`
      SELECT user_id, xp, level, prestige, coins, reputation
      FROM users
      ORDER BY prestige DESC, level DESC, xp DESC
      LIMIT ?
    `).all(maxLimit);

    return NextResponse.json({
      success: true,
      data: rows.map((row: any) => ({
        userId: row.user_id,
        xp: row.xp,
        level: row.level,
        prestige: row.prestige,
        coins: row.coins,
        reputation: row.reputation,
      })),
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

