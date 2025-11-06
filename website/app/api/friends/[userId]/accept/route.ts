import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/database';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId: requesterId } = await params;
    const currentUserId = session.user.id;

    const db = getDatabase();

    // Check if request exists
    const request = db.prepare(`
      SELECT status
      FROM friendships
      WHERE user_id = ? AND friend_id = ? AND status = 'pending'
    `).get(requesterId, currentUserId) as any;

    if (!request) {
      return NextResponse.json(
        { success: false, error: 'Friend request not found' },
        { status: 404 }
      );
    }

    // Accept friend request
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      UPDATE friendships
      SET status = 'accepted', accepted_at = ?
      WHERE user_id = ? AND friend_id = ?
    `).run(now, requesterId, currentUserId);

    return NextResponse.json({
      success: true,
      message: 'Friend request accepted',
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to accept friend request' },
      { status: 500 }
    );
  }
}

