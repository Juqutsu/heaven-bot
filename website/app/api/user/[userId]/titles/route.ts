import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const db = getDatabase();

    // Check if titles table exists
    let titles = [];
    let activeTitle = null;

    try {
      // Get user titles
      const userTitles = db.prepare(`
        SELECT
          ut.title_id,
          ut.unlocked_at,
          ut.source,
          t.name,
          t.description,
          t.category,
          t.color
        FROM user_titles ut
        JOIN titles t ON ut.title_id = t.title_id
        WHERE ut.user_id = ?
        ORDER BY ut.unlocked_at DESC
      `).all(userId) as any[];

      titles = userTitles.map((t) => ({
        id: t.title_id,
        name: t.name,
        description: t.description,
        category: t.category,
        color: t.color,
        unlockedAt: t.unlocked_at,
        source: t.source,
      }));

      // Get active title
      const user = db.prepare(`
        SELECT active_title_id
        FROM users
        WHERE user_id = ?
      `).get(userId) as any;

      if (user?.active_title_id) {
        const active = titles.find((t) => t.id === user.active_title_id);
        if (active) {
          activeTitle = active;
        }
      }
    } catch (error) {
      // Titles table might not exist yet
      console.log('Titles table not found, skipping titles');
    }

    return NextResponse.json({
      success: true,
      data: {
        titles,
        activeTitle,
      },
    });
  } catch (error) {
    console.error('Error fetching titles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch titles' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const { titleId } = body;

    const db = getDatabase();

    // Check if user has this title
    const userTitle = db.prepare(`
      SELECT title_id
      FROM user_titles
      WHERE user_id = ? AND title_id = ?
    `).get(userId, titleId) as any;

    if (!userTitle) {
      return NextResponse.json(
        { success: false, error: 'Title not unlocked' },
        { status: 400 }
      );
    }

    // Update active title
    db.prepare(`
      UPDATE users
      SET active_title_id = ?
      WHERE user_id = ?
    `).run(titleId, userId);

    return NextResponse.json({
      success: true,
      message: 'Active title updated',
      data: { titleId },
    });
  } catch (error) {
    console.error('Error updating active title:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update active title' },
      { status: 500 }
    );
  }
}

