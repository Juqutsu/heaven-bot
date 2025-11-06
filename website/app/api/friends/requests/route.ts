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

    // Get pending requests (where user is the recipient)
    const pendingRequests = db.prepare(`
      SELECT 
        user_id as requester_id,
        created_at
      FROM friendships
      WHERE friend_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `).all(userId) as any[];

    // Get requester user data
    const requestsWithData = pendingRequests.map((request) => {
      const requester = db.prepare(`
        SELECT user_id, xp, level, prestige
        FROM users
        WHERE user_id = ?
      `).get(request.requester_id) as any;

      return {
        userId: request.requester_id,
        xp: requester?.xp || 0,
        level: requester?.level || 1,
        prestige: requester?.prestige || 0,
        createdAt: request.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: requestsWithData,
    });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch friend requests' },
      { status: 500 }
    );
  }
}

