import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const db = getDatabase();

    // Get user preferences
    const preferences = db.prepare(`
      SELECT profile_bio, profile_banner_url, color_scheme, display_preferences
      FROM user_preferences
      WHERE user_id = ?
    `).get(userId) as any;

    if (!preferences) {
      return NextResponse.json({
        success: true,
        data: {
          bio: null,
          bannerUrl: null,
          colorScheme: null,
          displayPreferences: {},
        },
      });
    }

    let displayPreferences = {};
    if (preferences.display_preferences) {
      try {
        displayPreferences = JSON.parse(preferences.display_preferences);
      } catch (error) {
        // Invalid JSON, use empty object
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        bio: preferences.profile_bio || null,
        bannerUrl: preferences.profile_banner_url || null,
        colorScheme: preferences.color_scheme || null,
        displayPreferences,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
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

    // Only allow users to update their own profile
    if (!session?.user?.id || session.user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bio, bannerUrl, colorScheme, displayPreferences } = body;

    const db = getDatabase();

    // Save or update profile preferences
    const now = Math.floor(Date.now() / 1000);
    const displayPrefsJson = displayPreferences ? JSON.stringify(displayPreferences) : null;

    db.prepare(`
      INSERT INTO user_preferences (user_id, profile_bio, profile_banner_url, color_scheme, display_preferences, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        profile_bio = excluded.profile_bio,
        profile_banner_url = excluded.profile_banner_url,
        color_scheme = excluded.color_scheme,
        display_preferences = excluded.display_preferences,
        updated_at = excluded.updated_at
    `).run(
      userId,
      bio || null,
      bannerUrl || null,
      colorScheme || null,
      displayPrefsJson,
      now
    );

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        bio: bio || null,
        bannerUrl: bannerUrl || null,
        colorScheme: colorScheme || null,
        displayPreferences: displayPreferences || {},
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

