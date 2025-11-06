import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DEFAULT_RANK_CARD_SETTINGS, RankCardSettings } from '@/lib/rankCardDefaults';

function mergeWithDefaults(settings: any): RankCardSettings {
  return {
    ...DEFAULT_RANK_CARD_SETTINGS,
    ...settings,
    avatar: { ...DEFAULT_RANK_CARD_SETTINGS.avatar, ...(settings.avatar || {}) },
    username: { ...DEFAULT_RANK_CARD_SETTINGS.username, ...(settings.username || {}) },
    prestige: { ...DEFAULT_RANK_CARD_SETTINGS.prestige, ...(settings.prestige || {}) },
    level: { ...DEFAULT_RANK_CARD_SETTINGS.level, ...(settings.level || {}) },
    xpInfo: { ...DEFAULT_RANK_CARD_SETTINGS.xpInfo, ...(settings.xpInfo || {}) },
    progressBar: { ...DEFAULT_RANK_CARD_SETTINGS.progressBar, ...(settings.progressBar || {}) },
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const db = getDatabase();

    // Get user rank card settings
    const settings = db.prepare(`
      SELECT primary_color, background_color, settings_json
      FROM user_rank_card_settings
      WHERE user_id = ?
    `).get(userId) as any;

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        success: true,
        data: DEFAULT_RANK_CARD_SETTINGS,
      });
    }

    // Parse JSON settings if exists, otherwise use legacy colors
    let parsedSettings: any = {};
    if (settings.settings_json) {
      try {
        parsedSettings = JSON.parse(settings.settings_json);
      } catch (e) {
        console.error('Error parsing settings JSON:', e);
      }
    }

    // Merge with legacy colors for backward compatibility
    if (settings.primary_color) {
      parsedSettings.primaryColor = settings.primary_color;
    }
    if (settings.background_color) {
      parsedSettings.backgroundColor = settings.background_color;
    }

    const mergedSettings = mergeWithDefaults(parsedSettings);

    return NextResponse.json({
      success: true,
      data: mergedSettings,
    });
  } catch (error) {
    console.error('Error fetching rank card settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rank card settings' },
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
    
    // If body has primaryColor/backgroundColor (legacy), convert to new format
    // Otherwise use the full settings object
    let settingsToSave: any = {};
    
    if (body.primaryColor !== undefined || body.backgroundColor !== undefined) {
      // Legacy format - just colors
      settingsToSave = {
        primaryColor: body.primaryColor || null,
        backgroundColor: body.backgroundColor || null,
      };
    } else {
      // New format - full settings object
      settingsToSave = body;
    }

    const db = getDatabase();

    // Validate colors if provided
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const colorFields = ['primaryColor', 'backgroundColor', 'usernameColor', 'prestigeColor', 
                         'levelColor', 'xpTextColor', 'progressBarFillColor', 'progressBarBgColor',
                         'progressBarTextColor', 'avatarBorderColor', 'shadowColor'];
    
    for (const field of colorFields) {
      if (settingsToSave[field] && !hexRegex.test(settingsToSave[field])) {
        return NextResponse.json(
          { success: false, error: `Invalid ${field} format` },
          { status: 400 }
        );
      }
    }

    // Save legacy colors separately for backward compatibility
    const primaryColor = settingsToSave.primaryColor || null;
    const backgroundColor = settingsToSave.backgroundColor || null;
    
    // Save full settings as JSON
    const settingsJson = JSON.stringify(settingsToSave);

    // Save or update rank card settings
    const insert = db.prepare(`
      INSERT INTO user_rank_card_settings (user_id, primary_color, background_color, settings_json, updated_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
      ON CONFLICT(user_id) DO UPDATE SET
        primary_color = excluded.primary_color,
        background_color = excluded.background_color,
        settings_json = excluded.settings_json,
        updated_at = strftime('%s', 'now')
    `);

    insert.run(
      userId,
      primaryColor,
      backgroundColor,
      settingsJson
    );

    const mergedSettings = mergeWithDefaults(settingsToSave);

    return NextResponse.json({
      success: true,
      message: 'Rank card settings updated successfully',
      data: mergedSettings,
    });
  } catch (error) {
    console.error('Error updating rank card settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update rank card settings' },
      { status: 500 }
    );
  }
}
