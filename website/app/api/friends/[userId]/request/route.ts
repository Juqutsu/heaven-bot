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

    const { userId: targetUserId } = await params;
    const currentUserId = session.user.id;

    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot send friend request to yourself' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Check if friendship already exists
    const existing = db.prepare(`
      SELECT status
      FROM friendships
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).get(currentUserId, targetUserId, targetUserId, currentUserId) as any;

    if (existing) {
      if (existing.status === 'accepted') {
        return NextResponse.json(
          { success: false, error: 'Already friends' },
          { status: 400 }
        );
      } else if (existing.status === 'pending') {
        return NextResponse.json(
          { success: false, error: 'Friend request already pending' },
          { status: 400 }
        );
      }
    }

    // Check if target user exists
    const targetUser = db.prepare(`
      SELECT user_id
      FROM users
      WHERE user_id = ?
    `).get(targetUserId) as any;

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Create friend request
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO friendships (user_id, friend_id, status, requested_by, created_at)
      VALUES (?, ?, 'pending', ?, ?)
    `).run(currentUserId, targetUserId, currentUserId, now);

    return NextResponse.json({
      success: true,
      message: 'Friend request sent',
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send friend request' },
      { status: 500 }
    );
  }
}

