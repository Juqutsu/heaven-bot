import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const db = getDatabase();

    // Get user achievements (badges)
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

    return NextResponse.json({
      success: true,
      data: achievements.map((ach) => ({
        id: ach.achievement_id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        type: ach.type,
        unlockedAt: ach.unlocked_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch badges' },
      { status: 500 }
    );
  }
}

