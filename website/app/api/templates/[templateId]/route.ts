import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
    const db = getDatabase();

    // Get template
    const template = db.prepare(`
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
      WHERE template_id = ?
    `).get(templateId) as any;

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get creator data
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

    return NextResponse.json({
      success: true,
      data: {
        templateId: template.template_id,
        name: template.name,
        description: template.description,
        settings: template.settings_json ? JSON.parse(template.settings_json) : null,
        createdBy: creator,
        isPublic: template.is_public === 1,
        usageCount: template.usage_count || 0,
        createdAt: template.created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { templateId } = await params;
    const db = getDatabase();

    // Get template
    const template = db.prepare(`
      SELECT settings_json, is_public
      FROM rank_card_templates
      WHERE template_id = ?
    `).get(templateId) as any;

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Increment usage count
    db.prepare(`
      UPDATE rank_card_templates
      SET usage_count = usage_count + 1
      WHERE template_id = ?
    `).run(templateId);

    // Parse settings
    const settings = template.settings_json ? JSON.parse(template.settings_json) : null;

    return NextResponse.json({
      success: true,
      message: 'Template applied successfully',
      data: {
        templateId,
        settings,
      },
    });
  } catch (error) {
    console.error('Error applying template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply template' },
      { status: 500 }
    );
  }
}

