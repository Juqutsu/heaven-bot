import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const db = getDatabase();

    // Get all guilds with member counts
    const guilds = db.prepare(`
      SELECT 
        g.guild_id,
        g.name,
        g.description,
        g.icon,
        g.leader_id,
        g.level,
        g.experience,
        g.coins,
        g.max_members,
        g.created_at,
        COUNT(gm.user_id) as member_count
      FROM guilds g
      LEFT JOIN guild_members gm ON g.guild_id = gm.guild_id
      GROUP BY g.guild_id
      ORDER BY g.level DESC, g.experience DESC
    `).all() as any[];

    // Get leader user data for each guild
    const guildsWithData = guilds.map((guild) => {
      const leader = db.prepare(`
        SELECT user_id, xp, level, prestige
        FROM users
        WHERE user_id = ?
      `).get(guild.leader_id) as any;

      return {
        guildId: guild.guild_id,
        name: guild.name,
        description: guild.description,
        icon: guild.icon,
        leaderId: guild.leader_id,
        leader: leader ? {
          userId: leader.user_id,
          xp: leader.xp,
          level: leader.level,
          prestige: leader.prestige,
        } : null,
        level: guild.level,
        experience: guild.experience,
        coins: guild.coins,
        maxMembers: guild.max_members,
        memberCount: guild.member_count || 0,
        createdAt: guild.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: guildsWithData,
    });
  } catch (error) {
    console.error('Error fetching guilds:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch guilds' },
      { status: 500 }
    );
  }
}

