import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const { userId } = await params;

    // Only allow users to access their own theme
    if (!session?.user?.id || session.user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getDatabase();

    // Get user preferences
    const preferences = db.prepare(`
      SELECT theme, color_scheme
      FROM user_preferences
      WHERE user_id = ?
    `).get(userId) as any;

    if (!preferences) {
      return NextResponse.json({
        success: true,
        data: {
          theme: 'dark',
          colorScheme: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        theme: preferences.theme || 'dark',
        colorScheme: preferences.color_scheme || null,
      },
    });
  } catch (error) {
    console.error('Error fetching theme:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch theme' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const { userId } = await params;

    // Only allow users to update their own theme
    if (!session?.user?.id || session.user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { theme, colorScheme } = body;

    const db = getDatabase();

    // Save or update theme preferences
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO user_preferences (user_id, theme, color_scheme, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        theme = excluded.theme,
        color_scheme = excluded.color_scheme,
        updated_at = excluded.updated_at
    `).run(userId, theme || 'dark', colorScheme || null, now);

    return NextResponse.json({
      success: true,
      message: 'Theme updated successfully',
      data: {
        theme: theme || 'dark',
        colorScheme: colorScheme || null,
      },
    });
  } catch (error) {
    console.error('Error updating theme:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update theme' },
      { status: 500 }
    );
  }
}

