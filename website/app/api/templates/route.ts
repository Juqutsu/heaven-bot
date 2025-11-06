import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const db = getDatabase();

    // Get public templates
    const templates = db.prepare(`
      SELECT 
        template_id,
        name,
        description,
        settings_json,
        created_by,
        is_public,
        usage_count,
        created_at
      FROM rank_card_templates
      WHERE is_public = 1
      ORDER BY usage_count DESC, created_at DESC
      LIMIT 50
    `).all() as any[];

    // Get creator user data
    const templatesWithData = templates.map((template) => {
      let creator = null;
      if (template.created_by) {
        const user = db.prepare(`
          SELECT user_id, xp, level, prestige
          FROM users
          WHERE user_id = ?
        `).get(template.created_by) as any;

        if (user) {
          creator = {
            userId: user.user_id,
            xp: user.xp,
            level: user.level,
            prestige: user.prestige,
          };
        }
      }

      return {
        templateId: template.template_id,
        name: template.name,
        description: template.description,
        settings: template.settings_json ? JSON.parse(template.settings_json) : null,
        createdBy: creator,
        isPublic: template.is_public === 1,
        usageCount: template.usage_count || 0,
        createdAt: template.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: templatesWithData,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, settings, isPublic } = body;

    if (!name || !settings) {
      return NextResponse.json(
        { success: false, error: 'Name and settings are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Math.floor(Date.now() / 1000);

    // Create template
    db.prepare(`
      INSERT INTO rank_card_templates (
        template_id,
        name,
        description,
        settings_json,
        created_by,
        is_public,
        usage_count,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      templateId,
      name,
      description || null,
      JSON.stringify(settings),
      session.user.id,
      isPublic ? 1 : 0,
      now
    );

    return NextResponse.json({
      success: true,
      message: 'Template saved successfully',
      data: {
        templateId,
        name,
        description,
        settings,
        isPublic: isPublic || false,
      },
    });
  } catch (error) {
    console.error('Error saving template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save template' },
      { status: 500 }
    );
  }
}

