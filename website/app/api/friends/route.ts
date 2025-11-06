import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getDatabase();
    const userId = session.user.id;

    // Get accepted friends
    const friends = db.prepare(`
      SELECT 
        CASE 
          WHEN user_id = ? THEN friend_id
          ELSE user_id
        END as friend_id,
        status,
        accepted_at
      FROM friendships
      WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
      ORDER BY accepted_at DESC
    `).all(userId, userId, userId) as any[];

    // Get friend user data
    const friendsWithData = friends.map((friendship) => {
      const friendId = friendship.friend_id;
      const friend = db.prepare(`
        SELECT user_id, xp, level, prestige, coins, reputation
        FROM users
        WHERE user_id = ?
      `).get(friendId) as any;

      return {
        userId: friendId,
        xp: friend?.xp || 0,
        level: friend?.level || 1,
        prestige: friend?.prestige || 0,
        coins: friend?.coins || 0,
        reputation: friend?.reputation || 0,
        acceptedAt: friendship.accepted_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: friendsWithData,
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch friends' },
      { status: 500 }
    );
  }
}

